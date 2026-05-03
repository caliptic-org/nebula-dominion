import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XpLevelThreshold, TierBadge } from './entities/xp-level-threshold.entity';
import { PlayerProgression } from './entities/player-progression.entity';
import { XpSourceEvent } from './entities/xp-source-event.entity';
import { XpSourceWeight } from './entities/xp-source-weight.entity';

export interface AwardXpResult {
  playerId: string;
  xpAwarded: number;
  totalXp: number;
  previousLevel: number;
  currentLevel: number;
  currentAge: number;
  tierBadge: TierBadge;
  leveledUp: boolean;
  // Non-null when the player crosses an age boundary and their tier badge changes.
  // Frontend consumes this to trigger the badge_upgrade animation.
  badgeUpgradeEvent: BadgeUpgradePayload | null;
}

export interface BadgeUpgradePayload {
  playerId: string;
  previousBadge: TierBadge;
  newBadge: TierBadge;
  newAge: number;
  newLevel: number;
  totalXp: number;
}

const THRESHOLD_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ProgressionService {
  private readonly logger = new Logger(ProgressionService.name);
  private thresholdCache: XpLevelThreshold[] | null = null;
  private thresholdCacheAt = 0;

  constructor(
    @InjectRepository(XpLevelThreshold)
    private readonly thresholdRepo: Repository<XpLevelThreshold>,
    @InjectRepository(PlayerProgression)
    private readonly progressionRepo: Repository<PlayerProgression>,
    @InjectRepository(XpSourceEvent)
    private readonly eventRepo: Repository<XpSourceEvent>,
    @InjectRepository(XpSourceWeight)
    private readonly weightRepo: Repository<XpSourceWeight>,
  ) {}

  // ─── Threshold cache ──────────────────────────────────────────────────────

  async reloadThresholds(): Promise<void> {
    this.thresholdCache = null;
    this.thresholdCacheAt = 0;
  }

  private async getThresholds(): Promise<XpLevelThreshold[]> {
    if (this.thresholdCache && Date.now() - this.thresholdCacheAt < THRESHOLD_CACHE_TTL_MS) {
      return this.thresholdCache;
    }
    this.thresholdCache = await this.thresholdRepo.find({ order: { level: 'ASC' } });
    this.thresholdCacheAt = Date.now();
    return this.thresholdCache;
  }

  private async getThresholdForLevel(level: number): Promise<XpLevelThreshold> {
    const thresholds = await this.getThresholds();
    const t = thresholds.find((t) => t.level === level);
    if (!t) throw new NotFoundException(`XP threshold not found for level ${level}`);
    return t;
  }

  // ─── XP source weights (hot-reload capable) ───────────────────────────────

  async getSourceWeights(playerAge: number): Promise<XpSourceWeight[]> {
    return this.weightRepo
      .createQueryBuilder('w')
      .where('w.unlocked_from_age <= :age', { age: playerAge })
      .getMany();
  }

  async updateSourceWeight(sourceType: string, weightPct: number): Promise<XpSourceWeight> {
    const weight = await this.weightRepo.findOne({ where: { sourceType } });
    if (!weight) throw new NotFoundException(`XP source weight not found: ${sourceType}`);
    weight.weightPct = weightPct;
    return this.weightRepo.save(weight);
  }

  // ─── Core: award XP ──────────────────────────────────────────────────────

  async awardXp(
    playerId: string,
    sourceType: string,
    amount: number,
    sessionId?: string,
  ): Promise<AwardXpResult> {
    // Ensure progression row exists
    let progression = await this.progressionRepo.findOne({ where: { playerId } });
    if (!progression) {
      progression = this.progressionRepo.create({ playerId, currentLevel: 1, currentAge: 1, totalXp: 0, tierBadge: 'acemi' });
      await this.progressionRepo.save(progression);
    }

    const previousLevel = progression.currentLevel;
    const previousBadge = progression.tierBadge;

    // Log telemetry event
    const event = this.eventRepo.create({
      playerId,
      sourceType,
      amount,
      sessionId: sessionId ?? null,
      ageAtEvent: progression.currentAge,
      levelAtEvent: progression.currentLevel,
    });
    await this.eventRepo.save(event);

    // Apply XP
    progression.totalXp = Number(progression.totalXp) + amount;

    // Check level-ups (may span multiple levels)
    const thresholds = await this.getThresholds();
    let leveledUp = false;
    let badgeUpgradeEvent: BadgeUpgradePayload | null = null;

    while (progression.currentLevel < 54) {
      const currentThreshold = thresholds.find((t) => t.level === progression.currentLevel);
      if (!currentThreshold) break;
      const xpNeeded = currentThreshold.xpForLevel;
      const xpIntoLevel = Number(progression.totalXp) - Number(currentThreshold.cumulativeXp);
      if (xpIntoLevel < xpNeeded) break;

      // Level up
      progression.currentLevel += 1;
      leveledUp = true;

      const nextThreshold = thresholds.find((t) => t.level === progression.currentLevel);
      if (nextThreshold) {
        const newAge = nextThreshold.age;
        const newBadge = nextThreshold.tierBadge;

        if (newAge !== progression.currentAge) {
          progression.currentAge = newAge;
          this.logger.log(`Player ${playerId} advanced to Age ${newAge}`);
        }

        if (newBadge !== previousBadge && !badgeUpgradeEvent) {
          badgeUpgradeEvent = {
            playerId,
            previousBadge,
            newBadge,
            newAge,
            newLevel: progression.currentLevel,
            totalXp: Number(progression.totalXp),
          };
          this.logger.log(`Player ${playerId} badge upgrade: ${previousBadge} → ${newBadge}`);
        }

        progression.tierBadge = newBadge;
      }
    }

    await this.progressionRepo.save(progression);

    return {
      playerId,
      xpAwarded: amount,
      totalXp: Number(progression.totalXp),
      previousLevel,
      currentLevel: progression.currentLevel,
      currentAge: progression.currentAge,
      tierBadge: progression.tierBadge,
      leveledUp,
      badgeUpgradeEvent,
    };
  }

  // ─── Read ────────────────────────────────────────────────────────────────

  async getProgression(playerId: string): Promise<PlayerProgression> {
    const prog = await this.progressionRepo.findOne({ where: { playerId } });
    if (!prog) throw new NotFoundException(`Progression not found for player ${playerId}`);
    return prog;
  }

  async getThresholdTable(): Promise<XpLevelThreshold[]> {
    return this.getThresholds();
  }

  async getXpBreakdown(
    playerId: string,
    since?: Date,
  ): Promise<{ sourceType: string; totalAmount: number; eventCount: number }[]> {
    const qb = this.eventRepo
      .createQueryBuilder('e')
      .select('e.source_type', 'sourceType')
      .addSelect('SUM(e.amount)', 'totalAmount')
      .addSelect('COUNT(*)', 'eventCount')
      .where('e.player_id = :playerId', { playerId })
      .groupBy('e.source_type');

    if (since) {
      qb.andWhere('e.created_at >= :since', { since });
    }

    return qb.getRawMany();
  }
}
