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
  getLevelDef,
  getMaxLevel,
  getFirstLevelForAge,
  getAgeTierBadge,
  MAX_AGE,
  MAX_LEVEL,
  ERA_CATCH_UP_PRODUCTION_MULTIPLIER,
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

  async awardXp(dto: AwardXpDto): Promise<{ progress: PlayerProgressDto; leveledUp: boolean }> {
    const record = await this.getOrCreateProgress(dto.userId);

    // Absolute max level — no more XP
    if (record.currentLevel >= MAX_LEVEL && getLevelDef(record.currentLevel)?.xpToNext === null) {
      return { progress: this.toDto(record), leveledUp: false };
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
    const totalXpBefore = record.totalXp;
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

    // ── Per-source daily cap (HIGH F6-econ) ──────────────────────────
    // Second wall after units.service's queue cap. Sum the player's XP
    // from this source since UTC midnight; if already at/over cap, no-op
    // success (don't 4xx — clients shouldn't have to special-case capped
    // grants, and the dedup path below already returns leveledUp=false on
    // benign skips). Caps are coarse-grained per UTC day; finer windows
    // (rolling hour, per-hour buckets) are deferred until telemetry shows
    // they matter.
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

    record.currentXp += finalAmount;
    record.totalXp += finalAmount;

    // Emit telemetry for XP source breakdown calibration
    this.emitTelemetry(dto.userId, dto.source, baseAmount, finalAmount, record);

    const leveledUp = await this.processLevelUps(record);

    await this.playerLevelRepo.save(record);

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
    return dto;
  }
}
