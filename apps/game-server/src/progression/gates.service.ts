import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { GATE_RULES, GateRule, describeRule } from './gates.config';

/**
 * Per-rule resolved state surfaced to the frontend. `current` and `required`
 * are stringified so the renderer doesn't need to know the rule's value type.
 *
 * `severity`:
 *   - hard: level / age / building / race. Player can't fulfill in-session.
 *   - soft: resource / unit count. Player can fulfill by playing.
 *
 * `met` is the per-rule pass; the surrounding GateEvalResult.unlocked is the
 * AND of all rules.
 */
export interface ResolvedRequirement {
  type: GateRule['type'];
  short: string;          // "Komuta Üssü Lv 2" — for inline subtitle
  long: string;           // "Komuta Üssü Lv 2 gerekli" — for modal
  current: string;        // "Lv 1" / "yok"
  required: string;       // "Lv 2"
  met: boolean;
  severity: 'hard' | 'soft';
}

export interface GateEvalResult {
  unlocked: boolean;
  requirements: ResolvedRequirement[];
  /** First unmet requirement.short — what to show on the locked button face. */
  primaryHint: string | null;
}

interface PlayerSnapshot {
  level: number;
  age: number;
  race: 'human' | 'zerg' | 'automaton' | 'beast' | 'demon' | null;
  buildings: Map<string, number>;   // type → max level owned
  resources: Record<'minerals' | 'gas' | 'energy' | 'science', number>;
  units: Map<string, number>;       // type → count
}

@Injectable()
export class GatesService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /**
   * Evaluate every gate against the player's live state. Caller passes the
   * authenticated userId; we fan-out one query per data source rather than
   * three JOINs because the rule set is small (~50 gates) and the player
   * state queries are individually indexed.
   */
  async evaluateAll(userId: string): Promise<Record<string, GateEvalResult>> {
    const snap = await this.loadSnapshot(userId);
    const out: Record<string, GateEvalResult> = {};
    for (const [gateId, rules] of Object.entries(GATE_RULES)) {
      out[gateId] = this.evaluateGate(rules, snap);
    }
    return out;
  }

  /**
   * Single-gate evaluation — exposed so other services (e.g. the buildings
   * controller validating "should I let this POST through?") can also call
   * it without going through the full /gates endpoint.
   */
  evaluateGate(rules: GateRule[], snap: PlayerSnapshot): GateEvalResult {
    const requirements = rules.map((rule) => this.resolveRule(rule, snap));
    const unlocked = requirements.every((r) => r.met);
    const primaryHint = requirements.find((r) => !r.met)?.short ?? null;
    return { unlocked, requirements, primaryHint };
  }

  private resolveRule(rule: GateRule, snap: PlayerSnapshot): ResolvedRequirement {
    const { short, long } = describeRule(rule);
    switch (rule.type) {
      case 'always_on':
        return { type: 'always_on', short, long, current: '', required: '', met: true, severity: 'hard' };

      case 'level':
        return {
          type: 'level',
          short, long,
          current: `Lv ${snap.level}`,
          required: `Lv ${rule.min}`,
          met: snap.level >= rule.min,
          severity: 'hard',
        };

      case 'age':
        return {
          type: 'age',
          short, long,
          current: `Çağ ${snap.age}`,
          required: `Çağ ${rule.min}`,
          met: snap.age >= rule.min,
          severity: 'hard',
        };

      case 'building': {
        const haveLevel = snap.buildings.get(rule.buildingType) ?? 0;
        const needLevel = rule.minLevel ?? 1;
        return {
          type: 'building',
          short, long,
          current: haveLevel > 0 ? `Lv ${haveLevel}` : 'yok',
          required: `Lv ${needLevel}`,
          met: haveLevel >= needLevel,
          severity: 'hard',
        };
      }

      case 'unit': {
        const have = snap.units.get(rule.unitType) ?? 0;
        const need = rule.minCount ?? 1;
        return {
          type: 'unit',
          short, long,
          current: String(have),
          required: String(need),
          met: have >= need,
          severity: 'soft',
        };
      }

      case 'resource': {
        const have = snap.resources[rule.resource] ?? 0;
        return {
          type: 'resource',
          short, long,
          current: String(have),
          required: String(rule.min),
          met: have >= rule.min,
          severity: 'soft',
        };
      }

      case 'race':
        return {
          type: 'race',
          short, long,
          current: snap.race ?? 'yok',
          required: rule.race,
          met: snap.race === rule.race,
          severity: 'hard',
        };
    }
  }

  /**
   * Load just enough player state to evaluate every gate. Three SELECTs total —
   * cheap because each table is indexed on user_id.
   *
   * If a row is missing (fresh player), we return safe defaults so the gates
   * still resolve (mostly to "locked" until first action populates state).
   */
  private async loadSnapshot(userId: string): Promise<PlayerSnapshot> {
    const [levelRows, buildingRows, resRows] = await Promise.all([
      this.ds.query<{ current_level: number; current_age: number; race: string | null }[]>(
        // The api owns race on `users` but game-server's player_levels caches
        // its own copy. Either is fine; LEFT JOIN tolerates the seed quirk
        // where a fresh player has no player_levels row yet.
        `SELECT pl.current_level, pl.current_age, u.race
         FROM users u
         LEFT JOIN player_levels pl ON pl.user_id = u.id::text
         WHERE u.id = $1
         LIMIT 1`,
        [userId],
      ),
      this.ds.query<{ type: string; level: number }[]>(
        // player_buildings columns are `player_id` (UUID matching the user)
        // and `status` is buildings_status_enum. Use `!=` against the
        // 'destroyed' enum literal so the count reflects buildings that
        // could still satisfy a gate (constructing buildings count too —
        // queueing the next one shouldn't require completion first).
        `SELECT type::text AS type, MAX(level)::int AS level
         FROM player_buildings
         WHERE player_id = $1 AND status != 'destroyed'
         GROUP BY type`,
        [userId],
      ),
      this.ds.query<{ mineral: number; gas: number; energy: number }[]>(
        // Schema realities: player_resources keys off `player_id` (not user_id)
        // and stores `mineral` singular, no science column. Science currency
        // lives in a separate flow that gates here don't read yet.
        `SELECT mineral, gas, energy
         FROM player_resources
         WHERE player_id = $1
         LIMIT 1`,
        [userId],
      ),
    ]);

    const lvl = levelRows[0];
    const buildings = new Map<string, number>();
    for (const r of buildingRows) buildings.set(r.type, r.level);
    const res = resRows[0] ?? { mineral: 0, gas: 0, energy: 0 };

    return {
      level: lvl?.current_level ?? 1,
      age:   lvl?.current_age ?? 1,
      race:  (lvl?.race as PlayerSnapshot['race']) ?? null,
      buildings,
      resources: {
        minerals: Number(res.mineral),     // gates.config.ts uses plural; schema uses singular
        gas:      Number(res.gas),
        energy:   Number(res.energy),
        science:  0,                       // not yet sourced — TODO when a gate actually checks it
      },
      units: new Map(),   // not yet sourced; covered later when unit-gated buttons matter
    };
  }
}
