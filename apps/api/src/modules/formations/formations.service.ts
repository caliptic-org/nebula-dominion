import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface UnitSlotInput {
  unitId: string;
  position?: number;
}

interface CommanderSlotInput {
  commanderId: string;
  position?: number;
}

interface PowerBreakdownRow {
  unitId: string;
  power: number;
  isCommander: boolean;
}

export interface PowerResult {
  totalPower: number;
  unitCount: number;
  commanderCount: number;
  breakdown: PowerBreakdownRow[];
}

/* Commander IDs at BAŞ KOMUTAN (tier 1) — these get a higher flat base
 * in the power proxy than the other tiers. Kept in sync by hand with
 * game-server's commanders.constants.ts COMMANDER_CATALOG. If new races
 * land or the tier-1 row moves, update this set.
 *
 * Two-table catalog drift is a known cost: the api module deliberately
 * doesn't import game-server's commander constants (they live in a
 * sibling Nest app, not a shared package, per CLAUDE.md §6 — `backend/`
 * is the only cross-import path and it's reserved for legacy api shims). */
const BAS_KOMUTAN_IDS: ReadonlySet<string> = new Set([
  'voss',     // İnsan
  'vex',      // Zerg
  'prime',    // Otomat
  'khorvash', // Canavar
  'malphas',  // Şeytan
]);

/** Mirror of FE clientPower in `apps/web/src/lib/formation-api.ts` —
 *  if you tweak the formula here, change it there too so the displayed
 *  number doesn't jump when the server response arrives.
 *
 *  power = floor(attack × 2 + defense × 1.5 + hp × 0.1 + speed × 0.5) */
function unitPower(stats: { attack: number; defense: number; hp: number; speed: number }): number {
  return Math.floor(
    stats.attack * 2 +
    stats.defense * 1.5 +
    stats.hp * 0.1 +
    stats.speed * 0.5,
  );
}

/** Mirror of FE commander power derivation in FormationScreenND.tsx
 *  (`power: c.level * 50 + (c.tier === 'BAŞ KOMUTAN' ? 200 : 100)`).
 *  Server-authoritative — confirms the optimistic number after debounce. */
function commanderPower(level: number, commanderId: string): number {
  const base = BAS_KOMUTAN_IDS.has(commanderId) ? 200 : 100;
  return level * 50 + base;
}

@Injectable()
export class FormationsService {
  private readonly logger = new Logger(FormationsService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Compute server-authoritative formation power for the caller.
   *
   * Reads `player_units` and `player_commanders` (game-server-owned
   * tables, same Postgres DB per CLAUDE.md §1) via raw SQL. The api
   * module doesn't have the TypeORM entities for those tables so we
   * can't go through the repository.
   *
   * Slots referencing units/commanders the caller doesn't own (deleted
   * mid-edit, foreign keys from a stale formation, etc.) are silently
   * dropped from the breakdown. The FE keeps its optimistic local
   * sum, so a stale slot just shows a lower-than-expected server number
   * — which is the correct hint that "this slot isn't real."
   */
  async calculatePower(
    playerId: string,
    unitSlots: UnitSlotInput[] | undefined,
    commanderSlots: CommanderSlotInput[] | undefined,
  ): Promise<PowerResult> {
    const breakdown: PowerBreakdownRow[] = [];
    let totalPower = 0;
    let unitCount = 0;
    let commanderCount = 0;

    // ─── Units ──────────────────────────────────────────────────────────
    // Dedup by id so two slots referencing the same unit (shouldn't happen,
    // but be defensive) don't double-count.
    const unitIds = Array.from(
      new Set((unitSlots ?? []).map((s) => s.unitId).filter(Boolean)),
    );
    if (unitIds.length > 0) {
      try {
        const rows = await this.dataSource.query<
          Array<{ id: string; attack: number; defense: number; hp: number; speed: number }>
        >(
          `SELECT id, attack, defense, hp, speed
             FROM player_units
            WHERE player_id = $1
              AND id = ANY($2::uuid[])
              AND is_alive = true`,
          [playerId, unitIds],
        );
        for (const r of rows) {
          const p = unitPower({
            attack: Number(r.attack),
            defense: Number(r.defense),
            hp: Number(r.hp),
            speed: Number(r.speed),
          });
          breakdown.push({ unitId: r.id, power: p, isCommander: false });
          totalPower += p;
          unitCount += 1;
        }
      } catch (err) {
        // player_units table missing or query failure — log but don't
        // 500. FE falls back to optimistic power.
        this.logger.warn(
          `unit power query failed for player=${playerId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    // ─── Commanders ────────────────────────────────────────────────────
    const commanderIds = Array.from(
      new Set((commanderSlots ?? []).map((s) => s.commanderId).filter(Boolean)),
    );
    if (commanderIds.length > 0) {
      try {
        const rows = await this.dataSource.query<
          Array<{ commander_id: string; level: number; unlocked_at: Date | null }>
        >(
          `SELECT commander_id, level, unlocked_at
             FROM player_commanders
            WHERE user_id = $1::uuid
              AND commander_id = ANY($2::text[])`,
          [playerId, commanderIds],
        );
        for (const r of rows) {
          if (r.unlocked_at == null) continue; // locked tier-4 etc. — skip
          const lvl = Number(r.level) || 1;
          const p = commanderPower(lvl, r.commander_id);
          breakdown.push({ unitId: r.commander_id, power: p, isCommander: true });
          totalPower += p;
          commanderCount += 1;
        }
      } catch (err) {
        this.logger.warn(
          `commander power query failed for player=${playerId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return { totalPower, unitCount, commanderCount, breakdown };
  }
}
