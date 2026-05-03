import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlayerLevel } from './entities/player-level.entity';
import { XpTransaction } from './entities/xp-transaction.entity';
import {
  XpSource,
  XP_BASE_AMOUNTS,
  XP_SOURCE_WEIGHTS,
  XP_SOURCE_MIN_AGE,
  getLevelDef,
  getMaxLevel,
  getFirstLevel,
  getAgeTierBadge,
  AgeTierBadge,
  MAX_AGE,
  MAX_LEVEL,
  ContentUnlock,
} from './config/level-config';
import { ProgressionConfigService } from './config/progression-config.service';
import { AwardXpDto } from './dto/award-xp.dto';
import {
  LevelUpEvent,
  AgeTransitionEvent,
  PlayerProgressDto,
  XpGainedEvent,
  XpTelemetryEvent,
} from './dto/player-progress.dto';

const AGE_BADGE_LABELS: Record<AgeTierBadge, string> = {
  [AgeTierBadge.ACEMI]:     'Acemi',
  [AgeTierBadge.DENEYIMLI]: 'Deneyimli',
  [AgeTierBadge.SAMPIYON]:  'Şampiyon',
};

@Injectable()
export class ProgressionService {
  private readonly logger = new Logger(ProgressionService.name);

  constructor(
    @InjectRepository(PlayerLevel)
    private readonly playerLevelRepo: Repository<PlayerLevel>,
    @InjectRepository(XpTransaction)
    private readonly xpTxRepo: Repository<XpTransaction>,
    private readonly emitter: EventEmitter2,
    private readonly progressionConfig: ProgressionConfigService,
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

    this.logger.log(
      `XP awarded: user=${dto.userId} source=${dto.source} amount=${finalAmount} level=${record.currentLevel} age=${record.currentAge}`,
    );

    return { progress: this.toDto(record), leveledUp };
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
    source: string,
    baseAmount: number,
    finalAmount: number,
    record: PlayerLevel,
  ): void {
    const weight = XP_SOURCE_WEIGHTS[source as XpSource] ?? 0;
    const telemetryEvent: XpTelemetryEvent = {
      userId,
      source,
      baseAmount,
      finalAmount,
      level: record.currentLevel,
      age: record.currentAge,
      totalXp: record.totalXp,
      timestamp: new Date().toISOString(),
    };
    this.emitter.emit('progression.xp_telemetry', telemetryEvent);

    // Log an anomaly if a source contributes outside expected weight band
    if (weight === 0 && !['battle_win', 'battle_loss', 'quest_easy', 'quest_medium', 'quest_hard'].includes(source)) {
      this.logger.warn(`XP source '${source}' has no weight defined in XP_SOURCE_WEIGHTS`);
    }
  }

  /** Returns actual F2P daily XP rate for a player based on their transactions. */
  async getF2pProgressionRate(userId: string): Promise<{
    avgDailyXp: number;
    estimatedDaysToNextAge: number | null;
    onTrack: boolean;
  }> {
    const record = await this.getOrCreateProgress(userId);

    const rows: Array<{ day_xp: string }> = await this.xpTxRepo.query(
      `SELECT SUM(final_amount) AS day_xp
       FROM xp_transactions
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)`,
      [userId],
    );

    const dailyTotals = rows.map((r) => Number(r.day_xp));
    const avgDailyXp = dailyTotals.length
      ? Math.round(dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length)
      : 0;

    let estimatedDaysToNextAge: number | null = null;
    let onTrack = false;

    if (avgDailyXp > 0 && record.currentAge < MAX_AGE) {
      const threshold = this.progressionConfig.getThreshold(record.currentAge);
      const xpRemaining = threshold.xpEnd - record.totalXp;
      estimatedDaysToNextAge = Math.ceil(xpRemaining / avgDailyXp);

      const f2pTarget = threshold.f2pDaysTo - threshold.f2pDaysFrom;
      onTrack = estimatedDaysToNextAge <= f2pTarget;
    }

    return { avgDailyXp, estimatedDaysToNextAge, onTrack };
  }

  async reloadConfig(): Promise<void> {
    await this.progressionConfig.reloadFromDb();
    this.logger.log('Progression config hot-reloaded');
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
    return dto;
  }
}
