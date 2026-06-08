import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PlayerCommander } from './entities/player-commander.entity';
import {
  COMMANDER_CATALOG,
  CommanderBonus,
  CommanderCatalogEntry,
  CommanderRace,
  COMMANDER_MAX_LEVEL,
  getCommanderById,
  getCommanderBonus,
  getCommandersByRace,
  xpForNextLevel,
  NO_BONUS,
} from './commanders.constants';

/** Merged view of catalog + per-player progression. */
export interface CommanderView extends CommanderCatalogEntry {
  /** Whether this user has a player_commanders row for it. False = catalog-
   *  only (no progression yet — happens for unstarted races or locked tier
   *  4 slots not yet unlocked). */
  owned: boolean;
  level: number;
  xp: number;
  xpToNext: number;
  isActive: boolean;
  unlocked: boolean;
  /** Live bonus values at current level, for FE display. */
  bonusAtLevel: CommanderBonus;
}

@Injectable()
export class CommandersService {
  private readonly logger = new Logger(CommandersService.name);

  constructor(
    @InjectRepository(PlayerCommander)
    private readonly playerCommanderRepo: Repository<PlayerCommander>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * List the player's roster. On first call seeds the 3 starter (race-
   * matched, startsUnlocked) commanders so the player has a real
   * progression record from day 1 rather than relying on the catalog stub.
   * The 4th tier commander stays unrepresented in player_commanders until
   * a separate unlock flow inserts it (TODO: unlock by quest/age).
   *
   * @param userId  player id
   * @param race    filter to a specific race (null = full 20-commander gallery)
   */
  async listForPlayer(userId: string, race: CommanderRace | null): Promise<CommanderView[]> {
    // Seed if missing. Idempotent via ON CONFLICT DO NOTHING — multiple
    // concurrent first-loads can't double-insert.
    await this.seedStarterCommandersForPlayer(userId, race);

    const rows = await this.playerCommanderRepo.find({ where: { userId } });
    const rowsByCommanderId = new Map(rows.map((r) => [r.commanderId, r] as const));

    const catalog = race ? getCommandersByRace(race) : COMMANDER_CATALOG;
    return catalog.map((entry) => {
      const row = rowsByCommanderId.get(entry.id);
      const level = row?.level ?? 1;
      const xp = row ? Number(row.xp) : 0;
      return {
        ...entry,
        owned: !!row,
        level,
        xp,
        xpToNext: xpForNextLevel(level),
        isActive: row?.isActive ?? false,
        unlocked: row?.unlockedAt != null,
        bonusAtLevel: getCommanderBonus(entry.id, level),
      };
    });
  }

  /**
   * Ensures the player has player_commanders rows for every starter (race-
   * matched, startsUnlocked) catalog entry. Called by listForPlayer on
   * first read; safe to call repeatedly.
   *
   * If `race` filter is null, seeds all 5 races' starter commanders — used
   * for the cross-race gallery view. Most callers pass the player's own
   * race to keep the table slim.
   */
  private async seedStarterCommandersForPlayer(
    userId: string,
    race: CommanderRace | null,
  ): Promise<void> {
    const starters = (race ? getCommandersByRace(race) : COMMANDER_CATALOG).filter(
      (c) => c.startsUnlocked,
    );
    if (starters.length === 0) return;

    // Bulk insert; the (user_id, commander_id) unique index makes this
    // idempotent. Using raw SQL to keep the upsert atomic and avoid the
    // round-trips a per-row TypeORM upsert would need.
    const values = starters
      .map((_, i) => `($1::uuid, $${i + 2}, NOW())`)
      .join(', ');
    const params = [userId, ...starters.map((c) => c.id)];
    await this.dataSource.query(
      `INSERT INTO player_commanders (user_id, commander_id, unlocked_at)
       VALUES ${values}
       ON CONFLICT (user_id, commander_id) DO NOTHING`,
      params,
    );
  }

  /**
   * Activate one of the player's unlocked commanders. Deactivates any
   * currently-active commander for this user (partial unique index
   * enforces "at most one active per user").
   */
  async activate(userId: string, commanderId: string): Promise<CommanderView> {
    const catalog = getCommanderById(commanderId);
    if (!catalog) throw new NotFoundException('Komutan bulunamadı');

    await this.dataSource.transaction(async (manager) => {
      // ── CONCURRENCY GUARD ────────────────────────────────────────
      // Two tabs flipping different commanders in parallel could both
      // pass the "ownership + unlock" check, then both clear-then-set,
      // and the partial unique index would race against itself. Lock
      // the player's rows for the duration of the transaction so the
      // second activate blocks until the first commits.
      await manager.query(
        `SELECT id FROM player_commanders WHERE user_id = $1::uuid FOR UPDATE`,
        [userId],
      );

      const repo = manager.getRepository(PlayerCommander);
      const row = await repo.findOne({ where: { userId, commanderId } });
      if (!row) {
        throw new ForbiddenException('Bu komutan rosterında değil');
      }
      if (row.unlockedAt == null) {
        throw new BadRequestException('Bu komutan henüz kilitli');
      }

      // Single atomic UPDATE: flip target row to TRUE, every other row
      // for this user to FALSE in one statement. CASE WHEN keeps the
      // partial unique index satisfied at every observable point — no
      // intermediate "both active" state can be seen by another tx
      // because the row-level lock above serialises us.
      await manager.query(
        `UPDATE player_commanders
            SET is_active = (id = $2::uuid),
                updated_at = NOW()
          WHERE user_id = $1::uuid
            AND (is_active = TRUE OR id = $2::uuid)`,
        [userId, row.id],
      );
    });

    this.logger.log(`Commander activated: user=${userId} commander=${commanderId}`);
    const all = await this.listForPlayer(userId, catalog.race);
    return all.find((v) => v.id === commanderId)!;
  }

  /** Returns the player's currently-active commander view, or null. */
  async getActive(userId: string): Promise<CommanderView | null> {
    const row = await this.playerCommanderRepo.findOne({
      where: { userId, isActive: true },
    });
    if (!row) return null;
    const catalog = getCommanderById(row.commanderId);
    if (!catalog) return null;
    return {
      ...catalog,
      owned: true,
      level: row.level,
      xp: Number(row.xp),
      xpToNext: xpForNextLevel(row.level),
      isActive: true,
      unlocked: row.unlockedAt != null,
      bonusAtLevel: getCommanderBonus(catalog.id, row.level),
    };
  }

  /**
   * Returns the level-scaled bonus for the player's active commander, or
   * an empty bonus when no commander is active. This is the hot-path
   * consumed by combat / economy / training / research services — kept
   * lean (single DB read, no joins) so hooking it into a tight inner
   * loop (e.g. resource tick worker) stays cheap.
   */
  async getActiveBonus(userId: string): Promise<CommanderBonus> {
    const row = await this.playerCommanderRepo.findOne({
      where: { userId, isActive: true },
      select: ['commanderId', 'level'],
    });
    if (!row) return NO_BONUS;
    return getCommanderBonus(row.commanderId, row.level);
  }

  /**
   * Award XP to the active commander and bump level if the threshold is
   * crossed. Loops through level-ups so a single big grant (boss kill,
   * mission reward) can pop multiple levels in one call.
   *
   * Idempotency: caller passes referenceId; if the same id was already
   * awarded for this user, returns early. Prevents double-grant on
   * tick-worker retries. Stored in a side-table? — NO, for now we keep
   * idempotency to within-process via a Set; the dedupe across restarts
   * is the responsibility of the caller (most XP grants ride on event
   * emitters that themselves dedupe).
   *
   * Returns the post-grant state for downstream toast / FE refresh.
   */
  async awardXp(
    userId: string,
    amount: number,
  ): Promise<{ commanderId: string; levelBefore: number; levelAfter: number; xp: number } | null> {
    if (amount <= 0) return null;
    const row = await this.playerCommanderRepo.findOne({
      where: { userId, isActive: true },
    });
    if (!row) return null;
    if (row.level >= COMMANDER_MAX_LEVEL) {
      // Already maxed; just stamp lastBattleAt so we have telemetry.
      row.lastBattleAt = new Date();
      await this.playerCommanderRepo.save(row);
      return { commanderId: row.commanderId, levelBefore: row.level, levelAfter: row.level, xp: Number(row.xp) };
    }

    const levelBefore = row.level;
    let xp = Number(row.xp) + Math.floor(amount);
    let level = row.level;
    while (level < COMMANDER_MAX_LEVEL) {
      const need = xpForNextLevel(level);
      if (xp < need) break;
      xp -= need;
      level += 1;
    }

    row.level = level;
    row.xp = String(xp);
    row.lastBattleAt = new Date();
    await this.playerCommanderRepo.save(row);

    if (level > levelBefore) {
      this.logger.log(
        `Commander level-up: user=${userId} commander=${row.commanderId} ${levelBefore}→${level}`,
      );
    }

    return { commanderId: row.commanderId, levelBefore, levelAfter: level, xp };
  }

  /**
   * Unlock a previously-locked commander for the player. The caller is
   * expected to enforce the unlock condition (quest complete, age N+,
   * paid in gems); this method just stamps `unlocked_at` and creates the
   * row if missing.
   */
  async unlock(userId: string, commanderId: string): Promise<void> {
    const catalog = getCommanderById(commanderId);
    if (!catalog) throw new NotFoundException('Komutan bulunamadı');

    await this.dataSource.query(
      `INSERT INTO player_commanders (user_id, commander_id, unlocked_at)
       VALUES ($1::uuid, $2, NOW())
       ON CONFLICT (user_id, commander_id) DO UPDATE
         SET unlocked_at = COALESCE(player_commanders.unlocked_at, EXCLUDED.unlocked_at)`,
      [userId, commanderId],
    );
    this.logger.log(`Commander unlocked: user=${userId} commander=${commanderId}`);
  }

  /**
   * Unlock every age-gated commander the player has just earned.
   *
   * Wired from the `era.transition` event listener — when a player
   * advances into a new age, look up their race and unlock the tier-N
   * commander that gates.config.ts ('commander.tier4'/'commander.tier5')
   * had locked behind that age. Without this, the tier 4 + 5 slots
   * (kovacs / morgath / lokhode / azurath / kthala / korova) stayed
   * `unlockedAt = NULL` forever — formation filtered them out, players
   * could never deploy them.
   *
   * Idempotent: `unlock()` uses INSERT ... ON CONFLICT DO UPDATE so
   * resend / replay era.transition events don't matter. Iterating over
   * the catalog also means a catch-up jump (e.g. age 3 → 5) unlocks
   * BOTH tier 4 and tier 5 in one event.
   *
   * Race coverage gaps: canavar tier 4 + insan/otomat/seytan tier 5 are
   * intentionally absent from the catalog today (future content). The
   * iteration silently skips them — log surfaces the gap when none
   * match so QA can see "expected tier 4 but catalog has none for
   * race=canavar".
   */
  async unlockAgeGatedCommanders(userId: string, newAge: number): Promise<void> {
    // cycle 25 PROG-TIER2-3-EARLY-UNLOCK — TIER 2/3 are now age-gated too
    // (they used to ship startsUnlocked, letting a fresh L1 player run
    // +22-30% bonuses and subvert age pacing). TIER 2 gates at age 2, so age
    // 2 is now the earliest age-gated transition. Iterating the catalog means
    // a catch-up jump unlocks every tier the player has earned.
    if (newAge < 2) return; // tier 2 is the earliest age-gated tier

    const rows = await this.dataSource.query<Array<{ race: string | null }>>(
      `SELECT u.race FROM users u WHERE u.id = $1 LIMIT 1`,
      [userId],
    );
    const race = rows[0]?.race;
    if (!race) {
      this.logger.warn(
        `Era transition unlock skipped: no race on user=${userId} (gates not yet applied)`,
      );
      return;
    }
    // Catalog uses Turkish race keys (insan/zerg/otomat/canavar/seytan)
    // — see commanders.constants.ts CommanderRace. The api may store
    // either Turkish or English (`human`/etc.) depending on which
    // version of select-race ran. Normalise both shapes; unknown values
    // fall through to a no-op log.
    const RACE_ALIAS: Record<string, CommanderRace> = {
      human: 'insan',     insan: 'insan',
      zerg: 'zerg',
      automaton: 'otomat', otomat: 'otomat',
      beast: 'canavar',    canavar: 'canavar',
      demon: 'seytan',     seytan: 'seytan',
    };
    const canonicalRace = RACE_ALIAS[race.toLowerCase()];
    if (!canonicalRace) {
      this.logger.warn(
        `Era transition unlock skipped: unknown race='${race}' user=${userId}`,
      );
      return;
    }

    const candidates = getCommandersByRace(canonicalRace).filter((c) => {
      if (c.tier === 'TIER 2' && newAge >= 2) return true;
      if (c.tier === 'TIER 3' && newAge >= 3) return true;
      if (c.tier === 'TIER 4' && newAge >= 4) return true;
      if (c.tier === 'TIER 5' && newAge >= 5) return true;
      return false;
    });

    if (candidates.length === 0) {
      this.logger.log(
        `Era transition: no new commanders to unlock (race=${canonicalRace} newAge=${newAge})`,
      );
      return;
    }

    for (const c of candidates) {
      try {
        await this.unlock(userId, c.id);
      } catch (err) {
        // NotFoundException on getCommanderById can't happen here (we
        // sourced the id from the catalog), but a transient DB error
        // could. Log and continue so one bad insert doesn't block the
        // others.
        this.logger.error(
          `Failed to age-unlock commander id=${c.id} user=${userId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    this.logger.log(
      `Era transition unlocked ${candidates.length} commander(s) for race=${canonicalRace} newAge=${newAge}`,
    );
  }
}
