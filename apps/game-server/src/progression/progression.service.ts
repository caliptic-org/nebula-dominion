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
  getLevelDef,
  getMaxLevel,
  getFirstLevelForAge,
  ContentUnlock,
  MAX_AGE,
  ERA_CATCH_UP_PRODUCTION_MULTIPLIER,
} from './config/level-config';
import { AwardXpDto } from './dto/award-xp.dto';
import { LevelUpEvent, PlayerProgressDto, XpGainedEvent } from './dto/player-progress.dto';
import { ActiveBoostDto, EraTransitionEvent, EraTransitionPackage } from './dto/era-transition.dto';

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
    const maxLevel = getMaxLevel(record.currentAge);

    if (record.currentLevel >= maxLevel && getLevelDef(record.currentLevel, record.currentAge)?.xpToNext === null) {
      return { progress: this.toDto(record), leveledUp: false };
    }

    const levelBefore = record.currentLevel;
    const baseAmount = XP_BASE_AMOUNTS[dto.source];
    const levelDef = getLevelDef(record.currentLevel, record.currentAge);
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

    const leveledUp = await this.processLevelUps(record);

    await this.playerLevelRepo.save(record);

    const xpEvent: XpGainedEvent = {
      userId: dto.userId,
      xpGained: finalAmount,
      source: dto.source,
      currentXp: record.currentXp,
      xpToNext: getLevelDef(record.currentLevel, record.currentAge)?.xpToNext ?? null,
      currentLevel: record.currentLevel,
      age: record.currentAge,
    };
    this.emitter.emit('progression.xp_gained', xpEvent);

    this.logger.log(
      `XP awarded: user=${dto.userId} source=${dto.source} amount=${finalAmount} level=${record.currentLevel}`,
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

  async getActiveProductionBoost(userId: string): Promise<ActiveBoostDto> {
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
    const maxLevel = getMaxLevel(record.currentAge);

    while (record.currentLevel < maxLevel) {
      const currentDef = getLevelDef(record.currentLevel, record.currentAge);
      if (!currentDef || currentDef.xpToNext === null) break;
      if (record.currentXp < currentDef.xpToNext) break;

      record.currentXp -= currentDef.xpToNext;
      record.currentLevel += 1;

      const newDef = getLevelDef(record.currentLevel, record.currentAge);
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
          `Level up: user=${record.userId} level=${record.currentLevel} tier=${newDef.tier}`,
        );
      }

      leveledUp = true;
    }

    return leveledUp;
  }

  async advanceAge(userId: string): Promise<{ progress: PlayerProgressDto; advanced: boolean }> {
    const record = await this.getOrCreateProgress(userId);
    const maxLevel = getMaxLevel(record.currentAge);

    const isAtAgeMax =
      record.currentLevel >= maxLevel &&
      (getLevelDef(record.currentLevel, record.currentAge)?.xpToNext === null);

    if (!isAtAgeMax) {
      return { progress: this.toDto(record), advanced: false };
    }

    const nextAge = record.currentAge + 1;
    const nextAgeStartLevel = AGE_START_LEVEL[nextAge];
    if (!nextAgeStartLevel) {
      return { progress: this.toDto(record), advanced: false };
    }

    const nextAgeStartDef = getLevelDef(nextAgeStartLevel, nextAge);
    if (!nextAgeStartDef) {
      return { progress: this.toDto(record), advanced: false };
    }

    const previousAge = record.currentAge;
    record.currentAge = nextAge;
    record.currentLevel = nextAgeStartLevel;
    record.currentTier = nextAgeStartDef.tier;
    record.currentXp = 0;

    const newUnlocks = nextAgeStartDef.unlocks.filter(
      (u) => !record.unlockedContent.includes(u),
    );
    if (newUnlocks.length > 0) {
      record.unlockedContent = [...record.unlockedContent, ...newUnlocks];
    }

    await this.playerLevelRepo.save(record);

    const event: AgeAdvancedEvent = {
      userId,
      previousAge,
      newAge: nextAge,
      startLevel: nextAgeStartLevel,
    };
    this.emitter.emit('progression.age_advanced', event);

    this.logger.log(`Age advanced: user=${userId} age=${previousAge}→${nextAge} level=${nextAgeStartLevel}`);

    return { progress: this.toDto(record), advanced: true };
  }

  async getRecentTransactions(userId: string, limit = 20): Promise<XpTransaction[]> {
    return this.xpTxRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private toDto(record: PlayerLevel): PlayerProgressDto {
    const levelDef = getLevelDef(record.currentLevel, record.currentAge);
    const xpToNext = levelDef?.xpToNext ?? null;
    const isMaxLevel = xpToNext === null;
    const maxLevel = getMaxLevel(record.currentAge);
    const canAdvanceAge =
      isMaxLevel &&
      record.currentLevel >= maxLevel &&
      !!AGE_START_LEVEL[record.currentAge + 1];

    const xpProgressPercent =
      !isMaxLevel && xpToNext ? Math.min(100, Math.round((record.currentXp / xpToNext) * 100)) : 100;

    const dto = new PlayerProgressDto();
    dto.userId = record.userId;
    dto.age = record.currentAge;
    dto.level = record.currentLevel;
    dto.tier = record.currentTier;
    dto.currentXp = record.currentXp;
    dto.totalXp = record.totalXp;
    dto.xpToNextLevel = xpToNext;
    dto.xpProgressPercent = xpProgressPercent;
    dto.unlockedContent = record.unlockedContent;
    dto.tierBonusMultiplier = levelDef?.xpMultiplier ?? 1.0;
    dto.isMaxLevel = isMaxLevel;
    dto.canAdvanceAge = canAdvanceAge;
    return dto;
  }
}
