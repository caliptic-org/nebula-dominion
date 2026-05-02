import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlayerLevel } from './entities/player-level.entity';
import { XpTransaction } from './entities/xp-transaction.entity';
import {
  XpSource,
  XP_BASE_AMOUNTS,
  getLevelDef,
  getMaxLevel,
  ContentUnlock,
} from './config/level-config';
import { AwardXpDto } from './dto/award-xp.dto';
import { AgeAdvancedEvent, LevelUpEvent, PlayerProgressDto, XpGainedEvent } from './dto/player-progress.dto';

// Maps age -> first level of that age
const AGE_START_LEVEL: Record<number, number> = { 1: 1, 2: 10, 3: 19, 4: 28, 5: 37, 6: 46 };

@Injectable()
export class ProgressionService {
  private readonly logger = new Logger(ProgressionService.name);

  constructor(
    @InjectRepository(PlayerLevel)
    private readonly playerLevelRepo: Repository<PlayerLevel>,
    @InjectRepository(XpTransaction)
    private readonly xpTxRepo: Repository<XpTransaction>,
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
