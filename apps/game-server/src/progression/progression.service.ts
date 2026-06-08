import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlayerLevel } from './entities/player-level.entity';
import { XpTransaction } from './entities/xp-transaction.entity';
import { EraPackage } from './entities/era-package.entity';
import {
  XpSource,
  XP_BASE_AMOUNTS,
  XP_SOURCE_WEIGHTS,
  XP_SOURCE_MIN_AGE,
  XP_DAILY_CAPS,
  GLOBAL_DAILY_XP_CAP,
  getLevelDef,
  getMaxLevel,
  getFirstLevelForAge,
  getAgeTierBadge,
  MAX_AGE,
  MAX_LEVEL,
  ERA_CATCH_UP_PRODUCTION_MULTIPLIER,
  PRESTIGE_XP_PER_LEVEL,
  PRESTIGE_PROD_PER_LEVEL,
  PRESTIGE_PROD_CAP,
} from './config/level-config';
import { ProgressionConfigService } from './config/progression-config.service';
import { AwardXpDto } from './dto/award-xp.dto';
import { EraTransitionEvent, EraTransitionPackage, LevelUpEvent, PlayerProgressDto, XpGainedEvent } from './dto/player-progress.dto';
import {
  EVENT_GUILD_TUTORIAL_REQUIRED,
  GUILD_TUTORIAL_XP_THRESHOLD,
} from '../guilds/guilds.constants';

@Injectable()
export class ProgressionService {
  private readonly logger = new Logger(ProgressionService.name);

  constructor(
    @InjectRepository(PlayerLevel)
    private readonly playerLevelRepo: Repository<PlayerLevel>,
    @InjectRepository(XpTransaction)
    private readonly xpTxRepo: Repository<XpTransaction>,
    @InjectRepository(EraPackage)
    private readonly eraPackageRepo: Repository<EraPackage>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly emitter: EventEmitter2,
    private readonly progressionConfigService: ProgressionConfigService,
  ) {}

  async getOrCreateProgress(userId: string): Promise<PlayerLevel> {
    let record = await this.playerLevelRepo.findOne({ where: { userId } });
    if (!record) {
      record = this.playerLevelRepo.create({
        userId,
        currentAge: 1,
        currentLevel: 1,
        currentTier: 1,
        currentXp: 0,
        totalXp: 0,
        unlockedContent: [],
      });
      await this.playerLevelRepo.save(record);
    }
    return record;
  }

  async getProgress(userId: string): Promise<PlayerProgressDto> {
    const record = await this.getOrCreateProgress(userId);
    return this.toDto(record);
  }

  /**
   * FLOW-004 (endgame prestige) — accrue post-max XP into the prestige track.
   * Called by awardXp ONLY when the account is at MAX_LEVEL (where XP used to
   * be discarded). Self-contained so the hardened normal-leveling path stays
   * untouched. Idempotency reuses xp_transactions UNIQUE(user,source,ref); the
   * prestige_xp bump is a single atomic UPDATE. No daily cap — post-max XP is
   * a slow endless grind with nothing to "rush", and any accrual is strictly
   * better than the previous discard.
   */
  private async applyPrestigeXp(
    record: PlayerLevel,
    dto: AwardXpDto,
  ): Promise<{ progress: PlayerProgressDto; leveledUp: boolean }> {
    const baseAmount = XP_BASE_AMOUNTS[dto.source] ?? 0;
    const multiplier = getLevelDef(record.currentLevel)?.xpMultiplier ?? 1.0;
    const amount = Math.round(baseAmount * multiplier);
    if (amount <= 0) return { progress: this.toDto(record), leveledUp: false };

    // Idempotency — a duplicate (user, source, referenceId) means this XP was
    // already turned into prestige; return the current state without re-adding.
    try {
      await this.xpTxRepo.save(
        this.xpTxRepo.create({
          userId: dto.userId,
          source: dto.source,
          baseAmount,
          multiplier,
          finalAmount: amount,
          levelBefore: record.currentLevel,
          levelAfter: record.currentLevel,
          referenceId: dto.referenceId,
        }),
      );
    } catch (err) {
      const pgCode =
        err instanceof QueryFailedError
          ? ((err as QueryFailedError & { code?: string }).code ??
            (err as QueryFailedError & { driverError?: { code?: string } }).driverError?.code)
          : undefined;
      if (pgCode === '23505') {
        const fresh = await this.getOrCreateProgress(dto.userId);
        return { progress: this.toDto(fresh), leveledUp: false };
      }
      throw err;
    }

    // Accrue + cascade in ONE atomic statement so concurrent grants for the
    // same maxed user serialise at the row lock — no lost level-ups (the
    // lost-update class the awardXp atomic UPDATE already guards against).
    // Integer division banks whole prestige levels; modulo keeps the remainder.
    const levelBefore = record.prestigeLevel ?? 0;
    const rows = (await this.dataSource.query(
      `
      UPDATE player_levels
         SET prestige_level = prestige_level + ((prestige_xp + $1::int) / $2::int),
             prestige_xp     = (prestige_xp + $1::int) % $2::int,
             updated_at      = NOW()
       WHERE user_id = $3
      RETURNING prestige_level, prestige_xp
      `,
      [amount, PRESTIGE_XP_PER_LEVEL, dto.userId],
    )) as Array<{ prestige_level: number | string; prestige_xp: number | string }>;
    if (rows.length === 0) return { progress: this.toDto(record), leveledUp: false };

    const newLevel = Number(rows[0].prestige_level);
    const newXp = Number(rows[0].prestige_xp);
    const leveledUp = newLevel > levelBefore;
    if (leveledUp) {
      this.logger.log(`Prestige up: user=${dto.userId} prestige_level=${newLevel}`);
      // Best-effort emit: listeners (e.g. a production recalc) can react; the
      // bonus also bakes in on the next natural recalc (build/upgrade).
      this.emitter.emit('progression.prestige_up', { userId: dto.userId, prestigeLevel: newLevel });
    }
    record.prestigeLevel = newLevel;
    record.prestigeXp = newXp;
    return { progress: this.toDto(record), leveledUp };
  }

  /**
   * FLOW-004 — the player's permanent prestige production bonus (added to the
   * commander multiplier in BuildingsService.recalculateProductionRates). 0 for
   * everyone below max level / prestige 0, so it's a no-op for normal play.
   */
  async getPrestigeProductionBonus(userId: string): Promise<number> {
    const record = await this.getOrCreateProgress(userId);
    const bonus = (record.prestigeLevel ?? 0) * PRESTIGE_PROD_PER_LEVEL;
    return Math.min(PRESTIGE_PROD_CAP, Math.max(0, bonus));
  }

  /**
   * ELO-NOT-PERSISTED (cycle 23) — read a player's durable ranked rating for
   * matchmaking seeding. `?? ` guards cover a row created before this column
   * existed (in-memory create() returns the entity before DB defaults apply).
   */
  async getRanking(userId: string): Promise<{ elo: number; gamesPlayed: number }> {
    const record = await this.getOrCreateProgress(userId);
    return { elo: record.elo ?? 1000, gamesPlayed: record.rankedGames ?? 0 };
  }

  /**
   * ELO-NOT-PERSISTED (cycle 23) — persist the post-match rating and bump the
   * ranked-games counter (used by the ELO K-factor). Caller restricts this to
   * ranked PvP results so bot (PvE) farming can't inflate the ladder.
   *
   * Atomic single-statement UPDATE (mirrors the awardXp
   * ECON-PROG-AWARDXP-LOST-UPDATE fix): `ranked_games = ranked_games + 1`
   * serialises at the row lock so a concurrent finish can't drop an increment.
   * `elo` is an absolute SET — the caller already computed the post-match
   * rating, and a given user can only be in one match at a time. getOrCreate
   * first guarantees the row exists (a brand-new player's first ranked match).
   */
  async recordMatchResult(userId: string, newElo: number): Promise<void> {
    await this.getOrCreateProgress(userId);
    const elo = Math.max(0, Math.round(Number(newElo) || 0));
    await this.dataSource.query(
      `
      UPDATE player_levels
         SET elo = $1,
             ranked_games = ranked_games + 1,
             updated_at = NOW()
       WHERE user_id = $2
      `,
      [elo, userId],
    );
  }

  /**
   * Grants XP to a player, advancing level/age boundaries as appropriate.
   *
   * ── CONCURRENCY CONTRACT (HIGH ECON-PROG-AWARDXP-LOST-UPDATE fix) ──
   * Pre-fix flow was getOrCreateProgress → ledger insert → mutate
   * record.currentXp/totalXp in memory → playerLevelRepo.save(). With no
   * row-level lock on player_levels, two concurrent awardXp(u, +X) calls
   * (e.g. mission claim + battle reward landing within one RTT, distinct
   * referenceIds so the ledger UNIQUE doesn't fire) both loaded the same
   * baseline snapshot, both computed currentXp+amount against that stale
   * read, and both .save() last-write-wins. The xp_transactions ledger
   * stayed correct (cycle 3 UNIQUE preserves idempotency) but
   * player_levels under-counted by exactly one grant per collision.
   *
   * Post-fix flow:
   *   1. Ledger row goes in FIRST (cycle 3 UNIQUE rejects duplicates).
   *   2. A single atomic SQL UPDATE bumps current_xp + total_xp on the
   *      row, with RETURNING giving us the post-update authoritative
   *      values. Postgres serializes the two UPDATEs at the row lock,
   *      so both increments stick — exactly mirrors the
   *      resources.service.grant() / deduct() pattern from cycle 10.
   *   3. We rehydrate the in-memory record from the RETURNING row
   *      (NOT the stale pre-UPDATE snapshot) before processLevelUps()
   *      so the level-boundary computation sees the true post-increment
   *      currentXp/totalXp.
   *   4. processLevelUps() may decrement currentXp and increment
   *      currentLevel/currentAge/unlocks; that save() is a separate
   *      write. The level-up branch is rarer than the XP increment and
   *      collisions are bounded (you can only consume each xpToNext
   *      threshold once); a residual race there is a separate, lower-
   *      severity concern tracked outside this fix.
   *
   * Verify: two concurrent awardXp(u, source X each granting 100),
   * starting current_xp=0 → final current_xp=200 with two ledger rows,
   * not 100 with one grant silently dropped.
   */
  async awardXp(dto: AwardXpDto): Promise<{ progress: PlayerProgressDto; leveledUp: boolean }> {
    const record = await this.getOrCreateProgress(dto.userId);

    // Absolute max level — XP can no longer level the account, so (FLOW-004)
    // redirect it into the PRESTIGE track instead of discarding it. The normal
    // leveling path below (clamp / daily caps / idempotency / atomic UPDATE /
    // processLevelUps) is untouched; applyPrestigeXp is self-contained.
    if (record.currentLevel >= MAX_LEVEL && getLevelDef(record.currentLevel)?.xpToNext === null) {
      return this.applyPrestigeXp(record, dto);
    }

    // Enforce age gate for restricted sources (e.g. PvP requires Age 3+)
    const minAge = XP_SOURCE_MIN_AGE[dto.source];
    if (minAge !== undefined && record.currentAge < minAge) {
      this.logger.warn(
        `XP source ${dto.source} requires age ${minAge}; player ${dto.userId} is age ${record.currentAge}`,
      );
      return { progress: this.toDto(record), leveledUp: false };
    }

    const levelBefore = record.currentLevel;
    const baseAmount = XP_BASE_AMOUNTS[dto.source] ?? 0;
    const levelDef = getLevelDef(record.currentLevel);
    const multiplier = levelDef?.xpMultiplier ?? 1.0;
    // ── ECONOMY GUARD ────────────────────────────────────────────────
    // GAME_SPEED_MULTIPLIER is for SPEEDING UP TIMERS, not multiplying
    // the XP per action. Previously scaledXp(80) at 1000× returned
    // 80 000 — a single training jumped the player from Lv 1 past Çağ
    // 4. With 1000× pacing the player already completes 1000× more
    // actions per wall-clock hour, which naturally compounds XP at the
    // intended rate. Double-counting (×1000 timers AND ×1000 XP) made
    // Lv 54 reachable in ~12 trains. Fix: XP is fixed per source.
    const finalAmount = Math.round(baseAmount * multiplier);

    // ── Per-source daily cap (HIGH F6-econ; cycle 17 BAL-4/BAL-02) ───
    // Second wall after units.service's queue cap. Sum the player's XP
    // from this source since UTC midnight; if already at/over cap, no-op
    // success (don't 4xx — clients shouldn't have to special-case capped
    // grants, and the dedup path below already returns leveledUp=false on
    // benign skips). Caps are coarse-grained per UTC day; finer windows
    // (rolling hour, per-hour buckets) are deferred until telemetry shows
    // they matter.
    //
    // This block is SOURCE-AGNOSTIC: it enforces whatever appears in
    // XP_DAILY_CAPS keyed by dto.source. cycle 17 added PVE_WIN/PVP_WIN
    // (8000 each), DAILY_MISSION (3000) and ACHIEVEMENT (5000) to that
    // map — closing the previously-uncapped battle-XP faucet — and they
    // are enforced here automatically with no per-source branching. The
    // summed final_amount is POST-multiplier, so the cap is a true XP/day
    // ceiling independent of the player's age xpMultiplier.
    const dailyCap = XP_DAILY_CAPS[dto.source];
    if (dailyCap !== undefined && finalAmount > 0) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const sumRow = await this.xpTxRepo
        .createQueryBuilder('tx')
        .select('COALESCE(SUM(tx.final_amount), 0)', 'sum')
        .where('tx.user_id = :userId', { userId: dto.userId })
        .andWhere('tx.source = :source', { source: dto.source })
        .andWhere('tx.created_at >= :todayStart', { todayStart })
        .getRawOne<{ sum: string | number }>();
      const earnedToday = Number(sumRow?.sum ?? 0);
      if (earnedToday + finalAmount > dailyCap) {
        this.logger.warn(
          `XP daily cap hit: user=${dto.userId} source=${dto.source} earned=${earnedToday} attempt=${finalAmount} cap=${dailyCap}`,
        );
        return { progress: this.toDto(record), leveledUp: false };
      }
    }

    // ── Global per-UTC-day XP cap (cycle 18 BAL17-NEW-3) ────────────────
    // The per-source caps above stop single-faucet dominance, but their
    // SUM (29,000/day) still let a grinder who maxes every faucet reach
    // Lv54 ~4.5× too fast. This GLOBAL ceiling sums ALL sources' post-
    // multiplier XP since UTC midnight and is a benign no-op success once
    // hit, mirroring the per-source cap above. Together they keep both
    // faucet diversity (per-source) AND the ~150-day pacing (global).
    if (finalAmount > 0) {
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const totalRow = await this.xpTxRepo
        .createQueryBuilder('tx')
        .select('COALESCE(SUM(tx.final_amount), 0)', 'sum')
        .where('tx.user_id = :userId', { userId: dto.userId })
        .andWhere('tx.created_at >= :dayStart', { dayStart })
        .getRawOne<{ sum: string | number }>();
      const totalToday = Number(totalRow?.sum ?? 0);
      if (totalToday + finalAmount > GLOBAL_DAILY_XP_CAP) {
        this.logger.warn(
          `Global XP daily cap hit: user=${dto.userId} total=${totalToday} attempt=${finalAmount} cap=${GLOBAL_DAILY_XP_CAP}`,
        );
        return { progress: this.toDto(record), leveledUp: false };
      }
    }

    // Insert the xp_tx row FIRST so a duplicate (user_id, source,
    // reference_id) trips the UNIQUE constraint before we mutate
    // player_level. Pre-fix, the mutation happened in memory first,
    // and a 23505 from xpTxRepo.save would have left record.currentXp
    // bumped even though the row didn't persist — split-brain.
    try {
      await this.xpTxRepo.save(
        this.xpTxRepo.create({
          userId: dto.userId,
          source: dto.source,
          baseAmount,
          multiplier,
          finalAmount,
          levelBefore,
          levelAfter: record.currentLevel,
          referenceId: dto.referenceId,
        }),
      );
    } catch (err) {
      // 23505 = unique_violation. The (user, source, referenceId)
      // grant already landed — treat as success-no-op rather than
      // surfacing a 500 to the caller. apps/api's daily-engagement
      // already expects 409-style benign duplicates and downgrades
      // them to debug logs; we return the current progress unchanged
      // and leveledUp=false.
      // QueryFailedError exposes the pg error code either as `.code`
      // (top-level on older typeorm) or under `.driverError.code` (newer
      // versions, matching apps/api/.../daily-engagement.service.ts).
      // Check both for portability.
      const pgCode =
        err instanceof QueryFailedError
          ? ((err as QueryFailedError & { code?: string }).code ??
              (err.driverError as { code?: string } | undefined)?.code)
          : undefined;
      if (pgCode === '23505') {
        this.logger.debug(
          `XP grant already credited: user=${dto.userId} source=${dto.source} ref=${dto.referenceId}`,
        );
        return { progress: this.toDto(record), leveledUp: false };
      }
      throw err;
    }

    // ── ATOMIC INCREMENT (HIGH ECON-PROG-AWARDXP-LOST-UPDATE) ────────
    // Single-statement UPDATE so concurrent grants serialize at the row
    // lock and both increments stick. RETURNING gives us the
    // post-update authoritative current_xp/total_xp — we MUST use these
    // (not the pre-UPDATE in-memory snapshot) when computing level
    // boundaries below, otherwise we'd re-introduce the same stale-read
    // window we just closed.
    const updRows = (await this.dataSource.query(
      `
      UPDATE player_levels
         SET current_xp = current_xp + $1,
             total_xp   = total_xp   + $1,
             updated_at = NOW()
       WHERE user_id = $2
      RETURNING current_xp, total_xp, current_level, current_age, current_tier
      `,
      [finalAmount, dto.userId],
    )) as Array<{
      current_xp: string | number;
      total_xp: string | number;
      current_level: number;
      current_age: number;
      current_tier: number;
    }>;

    if (updRows.length === 0) {
      // Unreachable under normal flow — getOrCreateProgress just created
      // the row. Bail without crashing if some upstream nuked it.
      this.logger.error(
        `awardXp UPDATE matched 0 rows: user=${dto.userId} source=${dto.source}`,
      );
      return { progress: this.toDto(record), leveledUp: false };
    }

    const updated = updRows[0];
    const totalXpBefore = Number(updated.total_xp) - finalAmount;

    // Rehydrate the in-memory record from the RETURNING row so
    // processLevelUps sees the true post-increment values (current_xp
    // could reflect a concurrent grant's bump too — which is correct,
    // we should consume those XP toward level boundaries here even if
    // the other call hasn't run its own boundary check yet; the
    // boundary is idempotent in the sense that each xpToNext threshold
    // can only be crossed once before the level increments).
    record.currentXp = Number(updated.current_xp);
    record.totalXp   = Number(updated.total_xp);
    // current_level/age/tier are not touched by the UPDATE itself, but
    // a concurrent grant could have already advanced them — pick up
    // whatever the row now holds so we don't roll back a sibling
    // call's level-up.
    record.currentLevel = updated.current_level;
    record.currentAge   = updated.current_age;
    record.currentTier  = updated.current_tier;

    // Emit telemetry for XP source breakdown calibration
    this.emitTelemetry(dto.userId, dto.source, baseAmount, finalAmount, record);

    const leveledUp = await this.processLevelUps(record);

    // Only save if processLevelUps actually advanced level/age/tier/
    // unlocks/currentXp. The XP increment itself is already persisted
    // by the atomic UPDATE above, so the common no-level-up path
    // doesn't need a second write.
    if (leveledUp) {
      await this.playerLevelRepo.save(record);
    }

    const xpEvent: XpGainedEvent = {
      userId: dto.userId,
      xpGained: finalAmount,
      source: dto.source,
      currentXp: record.currentXp,
      xpToNext: getLevelDef(record.currentLevel)?.xpToNext ?? null,
      currentLevel: record.currentLevel,
      age: record.currentAge,
    };
    this.emitter.emit('progression.xp_gained', xpEvent);

    if (
      totalXpBefore < GUILD_TUTORIAL_XP_THRESHOLD &&
      record.totalXp >= GUILD_TUTORIAL_XP_THRESHOLD
    ) {
      this.emitter.emit(EVENT_GUILD_TUTORIAL_REQUIRED, {
        userId: dto.userId,
        totalXp: record.totalXp,
        age: record.currentAge,
      });
      this.logger.log(
        `Guild tutorial threshold crossed: user=${dto.userId} totalXp=${record.totalXp}`,
      );
    }

    this.logger.log(
      `XP awarded: user=${dto.userId} source=${dto.source} amount=${finalAmount} level=${record.currentLevel} age=${record.currentAge}`,
    );

    return { progress: this.toDto(record), leveledUp };
  }

  // Advances a player from their current max-level age to the next age and grants the era catch-up package.
  async advanceAge(userId: string): Promise<{ progress: PlayerProgressDto; eraPackage: EraPackage }> {
    const record = await this.getOrCreateProgress(userId);
    const maxLevel = getMaxLevel(record.currentAge);

    if (record.currentLevel < maxLevel) {
      throw new BadRequestException(
        `Player must reach max level (${maxLevel}) of Age ${record.currentAge} before advancing.`,
      );
    }

    if (record.currentAge >= MAX_AGE) {
      throw new BadRequestException(`Player is already at the maximum age (${MAX_AGE}).`);
    }

    // Building-tier gate: XP alone isn't enough — the player's keep
    // (komuta üssü / command_center) must be at the current age's
    // max level too, so they can't farm XP from missions and skip the
    // build economy. Mirror of the per-building upgrade prerequisites:
    // diğer binalar HQ'yu geçemez, dolayısıyla HQ = en yüksek bina
    // seviyesi. Çağ 2'ye geçmek için HQ Lv 9, Çağ 3 için Lv 18, ...
    //
    // Raw query because progression module doesn't depend on the
    // buildings module (would introduce a circular dep — buildings
    // already depends on progression for awardXp).
    const hqRows = await this.dataSource.query<{ level: number }[]>(
      `SELECT level FROM player_buildings
        WHERE player_id = $1
          AND type     = 'command_center'
          AND status   = 'active'
        ORDER BY level DESC LIMIT 1`,
      [userId],
    );
    const hqLevel = hqRows?.[0]?.level ?? 0;
    if (hqLevel < maxLevel) {
      throw new BadRequestException(
        `Komuta Üssü Lv ${maxLevel} gerekli (şu an Lv ${hqLevel}). XP yeterli ama yapılar yetişmedi.`,
      );
    }

    const existing = await this.eraPackageRepo.findOne({
      where: { userId, toAge: record.currentAge + 1 },
    });
    if (existing) {
      throw new BadRequestException(`Era catch-up package for Age ${record.currentAge + 1} already granted.`);
    }

    const fromAge = record.currentAge;
    const toAge = fromAge + 1;
    const firstLevel = getFirstLevelForAge(toAge);
    const newLevelDef = getLevelDef(firstLevel, toAge);

    if (!newLevelDef) {
      throw new BadRequestException(`No level definition found for Age ${toAge} Level ${firstLevel}.`);
    }

    // Move player to the first level of the new age
    record.currentAge = toAge;
    record.currentLevel = firstLevel;
    record.currentTier = newLevelDef.tier;
    record.currentXp = 0;

    const newUnlocks = newLevelDef.unlocks.filter((u) => !record.unlockedContent.includes(u));
    if (newUnlocks.length > 0) {
      record.unlockedContent = [...record.unlockedContent, ...newUnlocks];
    }

    await this.playerLevelRepo.save(record);

    // Build and persist the catch-up package
    const boostHours = newLevelDef.rewards.productionBoostHours ?? 24;
    const boostExpiresAt = new Date(Date.now() + boostHours * 60 * 60 * 1000);

    const eraPackage = await this.eraPackageRepo.save(
      this.eraPackageRepo.create({
        userId,
        fromAge,
        toAge,
        goldGranted: newLevelDef.rewards.gold ?? 0,
        gemsGranted: newLevelDef.rewards.gems ?? 0,
        premiumCurrencyGranted: newLevelDef.rewards.premiumCurrency ?? 0,
        unitPackCount: newLevelDef.rewards.unitPackCount ?? 0,
        productionBoostMultiplier: ERA_CATCH_UP_PRODUCTION_MULTIPLIER,
        productionBoostExpiresAt: boostExpiresAt,
      }),
    );

    const catchUpPackage: EraTransitionPackage = {
      goldGranted: eraPackage.goldGranted,
      gemsGranted: eraPackage.gemsGranted,
      premiumCurrencyGranted: eraPackage.premiumCurrencyGranted,
      unitPackCount: eraPackage.unitPackCount,
      productionBoostMultiplier: ERA_CATCH_UP_PRODUCTION_MULTIPLIER,
      productionBoostExpiresAt: boostExpiresAt,
    };

    const eraTransitionEvent: EraTransitionEvent = {
      userId,
      fromAge,
      toAge,
      catchUpPackage,
    };
    this.emitter.emit('era.transition', eraTransitionEvent);

    const levelUpEvent: LevelUpEvent = {
      userId,
      previousLevel: maxLevel,
      newLevel: firstLevel,
      age: toAge,
      tier: newLevelDef.tier,
      newUnlocks,
      rewards: newLevelDef.rewards,
      eraTransitionPackage: catchUpPackage,
    };
    this.emitter.emit('progression.level_up', levelUpEvent);

    this.logger.log(
      `Era advance: user=${userId} age=${fromAge}→${toAge} boost_expires=${boostExpiresAt.toISOString()}`,
    );

    return { progress: this.toDto(record), eraPackage };
  }

  async getActiveProductionBoost(userId: string): Promise<{ productionBoostMultiplier: number; productionBoostExpiresAt: Date | null; isActive: boolean }> {
    const boost = await this.eraPackageRepo.findOne({
      where: { userId, productionBoostExpiresAt: MoreThan(new Date()) },
      order: { grantedAt: 'DESC' },
    });

    return {
      productionBoostMultiplier: boost?.productionBoostMultiplier ?? 1.0,
      productionBoostExpiresAt: boost?.productionBoostExpiresAt ?? null,
      isActive: !!boost,
    };
  }

  private async processLevelUps(record: PlayerLevel): Promise<boolean> {
    let leveledUp = false;

    // Loop handles both within-age level-ups and age transitions
    while (record.currentLevel < MAX_LEVEL) {
      const maxLevelForAge = getMaxLevel(record.currentAge);

      // Within-age level-up
      if (record.currentLevel < maxLevelForAge) {
        const currentDef = getLevelDef(record.currentLevel);
        if (!currentDef || currentDef.xpToNext === null) break;
        if (record.currentXp < currentDef.xpToNext) break;

        record.currentXp -= currentDef.xpToNext;
        record.currentLevel += 1;

        const newDef = getLevelDef(record.currentLevel);
        if (newDef) {
          record.currentTier = newDef.tier;

          const newUnlocks = newDef.unlocks.filter(
            (u) => !record.unlockedContent.includes(u),
          );
          if (newUnlocks.length > 0) {
            record.unlockedContent = [...record.unlockedContent, ...newUnlocks];
          }

          const levelUpEvent: LevelUpEvent = {
            userId: record.userId,
            previousLevel: record.currentLevel - 1,
            newLevel: record.currentLevel,
            age: record.currentAge,
            tier: newDef.tier,
            newUnlocks,
            rewards: newDef.rewards,
          };
          this.emitter.emit('progression.level_up', levelUpEvent);

          this.logger.log(
            `Level up: user=${record.userId} level=${record.currentLevel} tier=${newDef.tier} age=${record.currentAge}`,
          );
        }

        leveledUp = true;
        continue;
      }

      // ── ECONOMY GUARD ──────────────────────────────────────────────
      // Player hit max level of current age — STAY HERE. Previously
      // this branch auto-advanced age (incremented currentAge, reset
      // level, granted unlocks) — which bypassed advanceAge()'s
      // building-tier gate. A determined player could farm CONSTRUCTION
      // XP (training/building/merging) and cascade through Çağ
      // 1→2→3→4→5→6 without ever upgrading their Komuta Üssü past
      // Lv 1. That's how the user reached Lv 54 with no buildings.
      // Fix: surplus XP banks at maxLevel; FE shows canAdvanceAge=true;
      // player presses "Çağ N'ye Geç" → advanceAge() endpoint runs the
      // HQ gate; if HQ Lv < ageMax, transition refused.
      break;
    }

    return leveledUp;
  }

  private emitTelemetry(
    userId: string,
    source: XpSource,
    baseAmount: number,
    finalAmount: number,
    record: PlayerLevel,
  ): void {
    this.emitter.emit('progression.xp_telemetry', {
      userId,
      source,
      baseAmount,
      finalAmount,
      level: record.currentLevel,
      age: record.currentAge,
      totalXp: record.totalXp,
      timestamp: new Date().toISOString(),
    });
  }

  async reloadConfig(): Promise<{ success: boolean; reason?: string }> {
    return this.progressionConfigService.reloadFromDb();
  }

  async getRecentTransactions(userId: string, limit = 20): Promise<XpTransaction[]> {
    return this.xpTxRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private toDto(record: PlayerLevel): PlayerProgressDto {
    const levelDef = getLevelDef(record.currentLevel);
    const xpToNext = levelDef?.xpToNext ?? null;
    const isMaxLevel = record.currentLevel >= MAX_LEVEL && xpToNext === null;

    const xpProgressPercent =
      !isMaxLevel && xpToNext
        ? Math.min(100, Math.round((record.currentXp / xpToNext) * 100))
        : 100;

    const dto = new PlayerProgressDto();
    dto.userId = record.userId;
    dto.age = record.currentAge;
    dto.level = record.currentLevel;
    dto.tier = record.currentTier;
    dto.badgeTier = getAgeTierBadge(record.currentAge);
    dto.currentXp = record.currentXp;
    dto.totalXp = record.totalXp;
    dto.xpToNextLevel = xpToNext;
    dto.xpProgressPercent = xpProgressPercent;
    dto.unlockedContent = record.unlockedContent;
    dto.tierBonusMultiplier = levelDef?.xpMultiplier ?? 1.0;
    dto.isMaxLevel = isMaxLevel;
    dto.canAdvanceAge = record.currentLevel >= getMaxLevel(record.currentAge) && record.currentAge < MAX_AGE;
    // FLOW-004 — prestige track (only meaningful at max level, 0 otherwise).
    dto.prestigeLevel = record.prestigeLevel ?? 0;
    dto.prestigeXp = record.prestigeXp ?? 0;
    dto.prestigeXpPerLevel = PRESTIGE_XP_PER_LEVEL;
    return dto;
  }
}
