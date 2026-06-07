import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Race } from './entities/race.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { OnboardingService } from '../modules/onboarding/onboarding.service';

// SEC/PII: Split profile field projections so list + cross-user lookups
// don't leak `email` / `lastLoginAt` to any authenticated caller.
// Audit S7: GET /users and GET /users/:id used to return the full
// PROFILE_FIELDS for everyone, producing a phishing-ready (email,
// lastSeen) target list. Public lookups now return PUBLIC_FIELDS only;
// self-lookups (and the /users/profile route, which is always self) get
// PRIVATE_FIELDS.
const PUBLIC_FIELDS: (keyof User)[] = [
  'id',
  'username',
  'race',
  'isActive',
  'createdAt',
];

const PRIVATE_FIELDS: (keyof User)[] = [
  ...PUBLIC_FIELDS,
  'email',
  'updatedAt',
  'lastLoginAt',
];

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly onboardingService: OnboardingService,
  ) {}

  async findAll(): Promise<Omit<User, 'password'>[]> {
    // Public projection — no email/lastLoginAt for the list endpoint.
    const users = await this.userRepo.find({ select: PUBLIC_FIELDS });
    return users as Omit<User, 'password'>[];
  }

  async findOne(id: string, callerUserId?: string): Promise<Omit<User, 'password'>> {
    // Self-lookups see the private projection (email, updatedAt,
    // lastLoginAt). Anyone else gets only the public columns. Controller
    // passes req.user.id as callerUserId for GET /users/:id; service
    // callers that already know it's self (e.g. getProfile) can pass id
    // for both or rely on the explicit private variant below.
    const fields = callerUserId === id ? PRIVATE_FIELDS : PUBLIC_FIELDS;
    const user = await this.userRepo.findOne({ where: { id }, select: fields });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user as Omit<User, 'password'>;
  }

  /**
   * Fetch the full self-profile for GET /users/profile.
   *
   * BLOCKER CHAIN-PROFILE-ALLIANCETAG-MISSING fix
   * ----------------------------------------------
   * Previously this returned only the `users` row columns (PRIVATE_FIELDS).
   * The alliance UI at apps/web/src/app/alliance/page.tsx derives
   * `hasAlliance = Boolean(profile?.allianceTag)` — a value the API never
   * sent — so after a player successfully joined an alliance the page
   * stayed pinned to the "İttifak Yok" empty state, every tab (Savaş /
   * Üyeler / Haberler) rendered the guildless banner, the war list never
   * loaded, and the declare-war modal was unreachable. From the player's
   * perspective they joined an alliance into a black hole.
   *
   * Fix: LEFT JOIN `alliance_members` → `alliances` so a single round-trip
   * brings back the player's alliance id, tag, name and role alongside
   * their private user columns. Players without an alliance get `null`
   * for those four fields (LEFT JOIN preserves the user row), so the
   * existing `Boolean(profile?.allianceTag)` derive on the FE keeps
   * working unchanged for guildless players.
   *
   * The four alliance fields are critical because:
   *  - `allianceTag` drives the `hasAlliance` empty-state gate on
   *    /alliance and is rendered in the page header chip.
   *  - `allianceId` lets the FE skip a fragile tag-match scan over the
   *    public /alliances discovery list (see page.tsx myAllianceId
   *    useMemo) and fetch wars for the player's own alliance directly.
   *  - `allianceName` saves a second round-trip just to render the
   *    summary tile header.
   *  - `allianceRole` unlocks role-gated FE actions (kick / promote /
   *    declare-war) — without it the FE has to assume "member".
   *
   * Raw SQL is used rather than queryBuilder to mirror the seed/seedUnit
   * patterns elsewhere in this service and to keep the column projection
   * tight (no `password_hash` ever leaves the DB).
   */
  async getProfile(id: string): Promise<Omit<User, 'password'> & {
    allianceId: string | null;
    allianceTag: string | null;
    allianceName: string | null;
    allianceRole: string | null;
  }> {
    const sql = `
      SELECT
        u.id,
        u.email,
        u.username,
        u.is_active        AS "isActive",
        u.race,
        u.last_login_at    AS "lastLoginAt",
        u.created_at       AS "createdAt",
        u.updated_at       AS "updatedAt",
        am.alliance_id     AS "allianceId",
        am.role            AS "allianceRole",
        a.tag              AS "allianceTag",
        a.name             AS "allianceName"
      FROM users u
      LEFT JOIN alliance_members am ON am.user_id = u.id
      LEFT JOIN alliances a         ON a.id = am.alliance_id
      WHERE u.id = $1
      LIMIT 1
    `;
    const rows = await this.dataSource.query(sql, [id]);
    const row = rows?.[0];
    if (!row) throw new NotFoundException(`User ${id} not found`);
    return row as Omit<User, 'password'> & {
      allianceId: string | null;
      allianceTag: string | null;
      allianceName: string | null;
      allianceRole: string | null;
    };
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    if (dto.username && dto.username !== user.username) {
      const taken = await this.userRepo.findOne({ where: { username: dto.username } });
      if (taken) throw new ConflictException('username already taken');
      user.username = dto.username;
    }

    await this.userRepo.save(user);
    // Self-update — return the private projection so the FE doesn't see
    // its own email/lastLoginAt vanish after a username change.
    return this.findOne(id, id);
  }

  async selectRace(id: string, race: Race): Promise<Omit<User, 'password'>> {
    // Playable-race whitelist.
    //
    // RACE_VALUES (enum DTO validation) accepts all 5 races because the
    // FE catalog has lore, commanders, buildings and assets for every
    // one. But UnitType enum + UNIT_CONFIGS in
    // apps/game-server/src/units/constants/race-configs.constants.ts
    // only carry trainable units for HUMAN + ZERG. AUTOMATON / BEAST /
    // DEMON players land on a base that can't train a single unit
    // (POST /units/train → "Unknown unit type"), can't merge, can't
    // queue PvP. Audit (workflow wf_cea4d7f7-3f1) flagged this as the
    // top "selectable but unplayable" trap.
    //
    // Until the 3-race unit kits ship (each needs ~6 unit configs +
    // stat balance + MERGE_RECIPES + a player_units_type_enum
    // migration), reject the unplayable races here so a new player
    // never gets stuck mid-tutorial.
    const PLAYABLE: Race[] = [Race.HUMAN, Race.ZERG];
    if (!PLAYABLE.includes(race)) {
      throw new BadRequestException(
        `Bu ırk yakında oynanabilir olacak — şu an sadece ${PLAYABLE.join(', ')} aktif.`,
      );
    }

    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (user.race) {
      throw new BadRequestException(
        'Race has already been chosen for this player and cannot be changed',
      );
    }
    user.race = race;
    await this.userRepo.save(user);

    // Onboarding sync — without this hook the tutorial's `race_selection`
    // step stays "currentStep" forever even though the player has
    // committed to a race via POST /users/me/race. The FE then either
    // re-prompts for race on next /onboarding/progress poll or leaves
    // the tutorial banner stuck. completeStep() throws if the player
    // isn't currently on that step (e.g. they skipped tutorial, or
    // already advanced); swallow non-fatally — race is already saved.
    try {
      await this.onboardingService.completeStep(id, {
        stepId: 'race_selection',
        selectedRace: race,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`onboarding.completeStep(race_selection) skipped for ${id}: ${msg}`);
    }

    // Seed starter buildings — without this, fresh players land on /base
    // with an empty grid AND every downstream feature gated by an active
    // building stays locked: /base/production can't train (no barracks
    // → gate `production.train_marine` blocks the button), /merge has
    // nothing to merge (no units → demo placeholder cards only), /shop
    // VIP claim works but the actual gameplay loop is dead.  The pack
    // covers the immediate progression chain plus every requiredBuilding
    // referenced by UNIT_CONFIGS for the selected race (so MEDIC/GHOST/
    // SIEGE_TANK for HUMAN and ULTRALISK/QUEEN for ZERG aren't locked
    // out from day 0).
    //
    // Idempotent ON CONFLICT: a player who somehow already has a row of
    // a type keeps theirs (e.g. dev seed scripts ran on the same uid).
    // Status 'active' so the gates evaluate immediately rather than
    // queueing the seed buildings through a fake construction cooldown.
    await this.seedStarterBuildings(id, race);
    await this.seedStarterUnits(id, race);
    await this.seedStarterScience(id);

    // Production-rate recompute hook — F2 fix (audit 2026-06-06).
    //
    // seedStarterBuildings() above INSERTs straight into
    // player_buildings via raw SQL. That bypasses
    // BuildingsService.recalculateProductionRates() which lives in the
    // sibling game-server process and is the ONLY code path that
    // refreshes player_resources.{mineral,gas,energy,population}_per_tick.
    //
    // Without this hook the freshly-seeded player has buildings but
    // *_per_tick stays at 0 forever — ResourceTickWorker.applyTickBulk
    // filters its UPDATE on the rate columns, so the wallet never ticks
    // up. Cycle 4 made HUMAN seed a gas_refinery instead of
    // mineral_extractor, but that fix is moot if the rates never
    // recompute: gas_per_tick = 0 from day 0, every gas-cost building
    // is unreachable, the player gives up.
    //
    // Best-effort: the call is fire-and-forget for failure handling
    // (timeout, network blip, game-server boot-incomplete). The next
    // legitimate building action from the player will hit
    // startConstruction → recalculateProductionRates anyway, so the
    // rates self-heal. We log so a persistent failure is observable.
    await this.recalculateProductionRatesViaGameServer(id);

    // Self-action — caller is selecting their own race, so the response
    // should carry the private projection.
    return this.findOne(id, id);
  }

  /**
   * Cross-service call to game-server's POST
   * /api/buildings/internal/recalculate-rates.
   *
   * Pairs with `BuildingsController.recalculateRatesInternal()` in
   * apps/game-server. See that endpoint's JSDoc for the F2 fix rationale.
   *
   * - Target URL: `${GAME_SERVER_URL}/api/buildings/internal/recalculate-rates`,
   *   defaulting to `http://localhost:5000` for local dev (mirrors the
   *   convention already used by DailyEngagementService.creditWallet).
   *   Production docker-compose sets `GAME_SERVER_URL=http://game-server:3001`
   *   so api → game-server stays on the internal docker network.
   * - Auth: `X-Internal-Service: Bearer <INTERNAL_SERVICE_SECRET>`,
   *   falling back to `JWT_SECRET`. Both services already share the
   *   secret per CLAUDE.md §1 (JWT cross-service token).
   * - Best-effort: swallows all errors. A failed recompute is
   *   self-healing — the next building action from the player triggers
   *   the same recalc in-process. We must NOT let a transient
   *   game-server hiccup roll back the race-select flow (the player's
   *   race was already committed above).
   */
  private async recalculateProductionRatesViaGameServer(userId: string): Promise<void> {
    const baseUrl = (
      process.env.GAME_SERVER_URL || 'http://localhost:5000'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/api/buildings/internal/recalculate-rates`;

    const serviceSecret =
      process.env.INTERNAL_SERVICE_SECRET || process.env.JWT_SECRET;
    if (!serviceSecret) {
      this.logger.warn(
        `recalculateProductionRatesViaGameServer skipped for ${userId} — ` +
          'neither INTERNAL_SERVICE_SECRET nor JWT_SECRET is set; ' +
          'cannot sign request to game-server',
      );
      return;
    }

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': `Bearer ${serviceSecret}`,
        },
        body: JSON.stringify({ userId }),
        signal: ac.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(
          `game-server recalculate-rates non-2xx ${res.status} for ${userId} ` +
            `body=${text.slice(0, 200)}`,
        );
      } else {
        this.logger.log(`recalculateProductionRates ack for ${userId}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `recalculateProductionRatesViaGameServer failed for ${userId}: ${msg} ` +
          '(rates will self-heal on next building action)',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Grant a small science starter so day-1 Lv5 building upgrades are
   * reachable — cycle 17 BAL-02.
   *
   * Background: science was previously sourced ONLY from PvP battle
   * rewards + garrisoned galaxy nodes, yet every Lv5+ building upgrade
   * charges science. A pure base-builder who never touched the PvP/map
   * subsystem could NOT reach mid-game base progression — the science
   * wallet stayed at 0 (the entity default). Paired with the lab science
   * trickle (academy/cyber_core/hatchery sciencePerTick) and the 10×
   * cheaper upgrade gate (SCIENCE_COST_PER_LEVEL 50 → 5), a 500-science
   * starter covers the first handful of Lv5 upgrades (cost = level × 5)
   * without first winning a battle.
   *
   * Raw SQL — same Postgres DB as game-server, no entity import needed
   * (mirrors seedStarterBuildings). The player_resources row may not
   * exist yet (game-server creates it lazily via getOrCreate on first
   * snapshot), so we INSERT-or-bump: create the row with the starter
   * science if absent, otherwise GREATEST-raise an existing row so we
   * never lower a wallet that already earned science. Idempotent: safe to
   * replay. Non-fatal — a failed grant just leaves science at 0 and the
   * player can still earn it via battles/nodes, so we swallow + log.
   */
  private async seedStarterScience(userId: string): Promise<void> {
    const STARTER_SCIENCE = 500;
    try {
      await this.dataSource.query(
        `INSERT INTO player_resources (player_id, science)
           VALUES ($1::uuid, $2)
         ON CONFLICT (player_id)
           DO UPDATE SET science = GREATEST(player_resources.science, EXCLUDED.science)`,
        [userId, STARTER_SCIENCE],
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`seedStarterScience failed for ${userId}: ${msg}`);
    }
  }

  private async seedStarterBuildings(userId: string, race: Race): Promise<void> {
    // Race-specific full unit-roster coverage (audit C1 + USR follow-up).
    //
    // Previously seeded only 4 buildings (HQ + mineral + power + one
    // training building). That covered the first trainable unit per race
    // but every other UNIT_CONFIGS entry whose `requiredBuilding` was
    // *not* barracks/spawning_pool failed at POST /units/train with
    // "required building not found":
    //
    //   HUMAN  → MEDIC, GHOST need ACADEMY; SIEGE_TANK needs FACTORY
    //   ZERG   → ULTRALISK, QUEEN need HATCHERY
    //
    // (See apps/game-server/src/units/constants/race-configs.constants.ts
    //  lines 125, 138, 151, 271, 284.) Without these the entire mid-tier
    // unit lineup is locked behind a building the player has no UI to
    // discover, let alone build — /base/production renders the card,
    // taps return 400, the player gives up.
    //
    // Fix: seed the full race's `requiredBuilding` set up front. The
    // base layout uses x∈[3..5], y∈[4..5]; new buildings extend into
    // y=3 (north row) so the player still has clear footprint room
    // around the spawn.
    //
    // When the 3-race kits ship (currently A5 whitelist blocks
    // otomat/canavar/seytan), add their requiredBuilding rosters here.
    //
    // HUMAN gas-income note (F3): the HUMAN race lex in
    // apps/web/src/lib/nd-tokens.ts declares `yakit_rafinerisi`
    // (gas_refinery) as its unlocked Yakıt source but does NOT declare
    // mineral_extractor — there is no race slot that maps to it. If we
    // seed mineral_extractor for HUMAN, the player has a building they
    // can never inspect or upgrade via the race-flavoured /base/build UI,
    // AND their gas_per_tick stays at 0 forever because nothing produces
    // gas from day 0. Swap mineral_extractor → gas_refinery for HUMAN:
    // command_center already trickles +5 mineral/tick, and the player
    // can build mineral-positive structures (additional gas_refinery or
    // future mineral nodes) via /base/build once they have surplus.
    // ZERG keeps mineral_extractor because its lex maps
    // `biyokutle_havuzu` → mineral_extractor (gas comes from
    // `subspace_damari` → gas_refinery, which the player can build
    // later — Zerg starter still favours bio/mineral pressure).
    const starters =
      race === Race.ZERG
        ? [
            { type: 'command_center',    x: 4, y: 4 },
            { type: 'mineral_extractor', x: 3, y: 4 },
            { type: 'solar_plant',       x: 5, y: 4 },
            { type: 'spawning_pool',     x: 4, y: 5 },
            { type: 'hatchery',          x: 4, y: 3 },
          ]
        : [
            { type: 'command_center',    x: 4, y: 4 },
            // HUMAN: gas_refinery instead of mineral_extractor — see
            // block comment above. Day-zero economy: +5 mineral/tick
            // from command_center base trickle, +10 gas/tick from
            // gas_refinery, +20 energy/tick from solar_plant. Without
            // this swap, gas_per_tick = 0 and every gas-cost building
            // (barracks/academy/factory upgrade, future units) is
            // unreachable until the player grinds a gas trade or wait.
            { type: 'gas_refinery',      x: 3, y: 4 },
            { type: 'solar_plant',       x: 5, y: 4 },
            { type: 'barracks',          x: 4, y: 5 },
            { type: 'academy',           x: 3, y: 3 },
            { type: 'factory',           x: 5, y: 3 },
          ];
    // Raw SQL — same Postgres DB as game-server, no entity import needed.
    // ON CONFLICT DO NOTHING via the partial unique pattern: skip insert
    // if the player already has a row at the same (player_id, type, x, y).
    // The actual UNIQUE constraint isn't there; we filter by SELECT-then-
    // INSERT to avoid duplicate command_center rows from a replay.
    for (const s of starters) {
      try {
        await this.dataSource.query(
          `INSERT INTO player_buildings
             (player_id, type, level, status, position_x, position_y,
              construction_started_at, construction_complete_at)
           SELECT $1::uuid, $2::buildings_type_enum, 1, 'active', $3, $4, NOW(), NOW()
           WHERE NOT EXISTS (
             SELECT 1 FROM player_buildings
             WHERE player_id = $1::uuid AND type = $2::buildings_type_enum
           )`,
          [userId, s.type, s.x, s.y],
        );
      } catch (err) {
        // Non-fatal — log and move on.  A player who lands on /base with
        // 3 of 4 starters still has a playable game; we don't want a
        // single bad enum value to wedge the whole race-select flow.
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`seedStarterBuildings(${s.type}) failed for ${userId}: ${msg}`);
      }
    }
  }

  private async seedStarterUnits(userId: string, race: Race): Promise<void> {
    // Audit C4: a freshly race-selected player landed on /inventory and
    // /battle with zero units — the build-train-merge loop was gated by
    // the seedStarterBuildings flow, but nothing handed them an actual
    // squad to play with. Empty roster → /battle "no units available"
    // 400, /inventory shows demo-placeholder grid, day-0 churn.
    //
    // Fix: hand out 3 starter units in the player's race (3× marine for
    // HUMAN, 3× zergling for ZERG). Stats follow the task-defined
    // baselines (marine 100/20/10/5, zergling 70/15/5/8) with the race
    // multipliers applied inline so the seeded rows match what
    // applyRaceBonuses() in game-server would produce.
    //
    // Race bonuses (mirrors RACE_BONUSES in race-configs.constants.ts):
    //   HUMAN → atk x1.0, def x1.15, hp x1.10, spd x1.0
    //   ZERG  → atk x1.15, def x0.85, hp x0.90, spd x1.30
    //
    // Speed column is int in player_units; we round to keep schema
    // compatibility. position_x/y land near the player's starter base
    // grid (x∈[3..5], y∈[4..5]) so the unit token renders on-map.
    let unitType: string;
    let hp: number;
    let attack: number;
    let defense: number;
    let speed: number;

    if (race === Race.ZERG) {
      unitType = 'zergling';
      // 70 * 0.90 = 63; 15 * 1.15 = 17.25 → 17; 5 * 0.85 = 4.25 → 4;
      // 8 * 1.30 = 10.4 → 10
      hp = 63;
      attack = 17;
      defense = 4;
      speed = 10;
    } else if (race === Race.HUMAN) {
      unitType = 'marine';
      // 100 * 1.10 = 110; 20 * 1.0 = 20; 10 * 1.15 = 11.5 → 12; 5
      hp = 110;
      attack = 20;
      defense = 12;
      speed = 5;
    } else {
      // Other races (AUTOMATON/BEAST/DEMON) currently blocked by the
      // PLAYABLE whitelist above — bail before we'd insert a unit_type
      // with no UNIT_CONFIGS entry. When their unit kits ship, add a
      // race→starter mapping here.
      return;
    }

    // Spread the 3 starters across adjacent tiles north of the base so
    // they don't all stack on the same coordinate (the battle/inventory
    // view groups by position; identical x,y collapses to one icon).
    const positions = [
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ];
    const raceValue = race === Race.ZERG ? 'zerg' : 'human';

    for (const pos of positions) {
      try {
        await this.dataSource.query(
          `INSERT INTO player_units
             (player_id, type, race, hp, max_hp, attack, defense, speed,
              position_x, position_y, created_at, updated_at)
           VALUES ($1::uuid, $2::player_units_type_enum,
                   $3::player_units_race_enum,
                   $4, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [userId, unitType, raceValue, hp, attack, defense, speed, pos.x, pos.y],
        );
      } catch (err) {
        // Non-fatal — log and continue. A player with 2/3 starters is
        // still playable; a hard throw here would wedge the whole
        // race-select endpoint (and roll back seedStarterBuildings's
        // committed rows if we ever wrap them in a transaction).
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`seedStarterUnits(${unitType}) failed for ${userId}: ${msg}`);
      }
    }
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    user.isActive = false;
    await this.userRepo.save(user);
  }
}
