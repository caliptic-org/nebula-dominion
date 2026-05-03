import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlayerLevel } from './entities/player-level.entity';
import { XpTransaction } from './entities/xp-transaction.entity';
import { EraPackage } from './entities/era-package.entity';
import {
  XpSource,
  XP_BASE_AMOUNTS,
  XP_SOURCE_WEIGHTS,
  XP_SOURCE_MIN_AGE,
  getLevelDef,
  getMaxLevel,
  getFirstLevel,
  getFirstLevelForAge,
  getAgeTierBadge,
  AgeTierBadge,
  AGE_BADGE_LABELS,
  MAX_AGE,
  MAX_LEVEL,
  ContentUnlock,
  ERA_CATCH_UP_PRODUCTION_MULTIPLIER,
} from './config/level-config';
import { ProgressionConfigService } from './config/progression-config.service';
import { AwardXpDto } from './dto/award-xp.dto';
import { AgeTransitionEvent, EraTransitionEvent, EraTransitionPackage, LevelUpEvent, PlayerProgressDto, XpGainedEvent } from './dto/player-progress.dto';
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
    const finalAmount = Math.round(baseAmount * multiplier);

    record.currentXp += finalAmount;
    record.totalXp += finalAmount;

    await this.xpTxRepo.save(
      this.xpTxRepo.create({
        userId: dto.userId,
        source: dto.source,
        baseAmount,
        multiplier,
        finalAmount,
        levelBefore,
        levelAfter: record.currentLevel,
        referenceId: dto.referenceId ?? null,
      }),
    );

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

      // Player is at max level of current age — check for age transition
      if (record.currentAge < MAX_AGE) {
        const previousAge = record.currentAge;
        const previousBadgeTier = getAgeTierBadge(previousAge);
        record.currentAge += 1;
        record.currentLevel = getFirstLevel(record.currentAge);
        // currentXp carries over as starting XP for the new age's first level

        const newBadgeTier = getAgeTierBadge(record.currentAge);
        const newDef = getLevelDef(record.currentLevel);
        if (newDef) {
          record.currentTier = newDef.tier;

          const newUnlocks = newDef.unlocks.filter(
            (u) => !record.unlockedContent.includes(u),
          );
          if (newUnlocks.length > 0) {
            record.unlockedContent = [...record.unlockedContent, ...newUnlocks];
          }
        }

        const transitionEvent: AgeTransitionEvent = {
          userId: record.userId,
          previousAge,
          newAge: record.currentAge,
          totalXpAtTransition: record.totalXp,
          badge_upgrade: {
            previousBadgeTier: previousBadgeTier !== newBadgeTier ? previousBadgeTier : null,
            newBadgeTier,
            badgeLabel: AGE_BADGE_LABELS[newBadgeTier],
          },
        };
        this.emitter.emit('progression.age_transition', transitionEvent);

        this.logger.log(
          `Age transition: user=${record.userId} age=${previousAge}→${record.currentAge} badge=${newBadgeTier} totalXp=${record.totalXp}`,
        );

        leveledUp = true;
        // Continue loop to process any level-ups within the new age
        continue;
      }

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
