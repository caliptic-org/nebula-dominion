import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TierProgress } from './entities/tier-progress.entity';
import { User } from '../../user/entities/user.entity';
import { Race } from '../../user/entities/race.enum';
import {
  MAX_TIER_LEVEL,
  TIER_LEVELS,
  TIER_LEVELS_BY_LEVEL,
  resolveAge,
  resolveTierName,
  xpRequiredForLevel,
} from './tier-table';

export interface TierProgressView {
  userId: string;
  currentLevel: number;
  currentAge: number;
  currentTierName: string;
  raceSpecificTierName: string | null;
  xp: string;
  xpToNextLevel: string;
  isMaxLevel: boolean;
  achievements: Record<string, unknown> | null;
}

export interface TierRequirementsView {
  currentLevel: number;
  nextLevel: number | null;
  isMaxLevel: boolean;
  required: {
    xp: string;
  } | null;
  nextTier: {
    level: number;
    age: number;
    name: string;
    description: string;
    durationLabel: string;
  } | null;
}

@Injectable()
export class TierService {
  private readonly logger = new Logger(TierService.name);

  constructor(
    @InjectRepository(TierProgress)
    private readonly progressRepo: Repository<TierProgress>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async getProgress(userId: string): Promise<TierProgressView> {
    const [progress, user] = await Promise.all([
      this.ensureProgress(userId),
      this.userRepo.findOne({ where: { id: userId } }),
    ]);
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return this.toView(progress, user.race);
  }

  async getRequirements(userId: string): Promise<TierRequirementsView> {
    const progress = await this.ensureProgress(userId);
    const nextLevel = progress.currentLevel + 1;
    if (progress.currentLevel >= MAX_TIER_LEVEL) {
      return {
        currentLevel: progress.currentLevel,
        nextLevel: null,
        isMaxLevel: true,
        required: null,
        nextTier: null,
      };
    }
    const nextDef = TIER_LEVELS_BY_LEVEL[nextLevel];
    return {
      currentLevel: progress.currentLevel,
      nextLevel,
      isMaxLevel: false,
      required: {
        xp: xpRequiredForLevel(nextLevel).toString(),
      },
      nextTier: nextDef
        ? {
            level: nextDef.level,
            age: nextDef.age,
            name: nextDef.name,
            description: nextDef.description,
            durationLabel: nextDef.durationLabel,
          }
        : null,
    };
  }

  async levelUp(userId: string): Promise<TierProgressView> {
    const [progress, user] = await Promise.all([
      this.ensureProgress(userId),
      this.userRepo.findOne({ where: { id: userId } }),
    ]);
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (progress.currentLevel >= MAX_TIER_LEVEL) {
      throw new BadRequestException('Already at maximum tier level (54)');
    }
    const nextLevel = progress.currentLevel + 1;
    const requiredXp = xpRequiredForLevel(nextLevel);
    const currentXp = BigInt(progress.xp);
    if (currentXp < requiredXp) {
      throw new BadRequestException(
        `Insufficient XP: have ${currentXp.toString()}, need ${requiredXp.toString()}`,
      );
    }

    progress.currentLevel = nextLevel;
    progress.currentAge = resolveAge(nextLevel);
    progress.currentTierName = resolveTierName(nextLevel, user.race);
    progress.xp = (currentXp - requiredXp).toString();
    progress.xpToNextLevel =
      nextLevel >= MAX_TIER_LEVEL
        ? '0'
        : xpRequiredForLevel(nextLevel + 1).toString();
    await this.progressRepo.save(progress);
    return this.toView(progress, user.race);
  }

  listLevels() {
    return TIER_LEVELS.map((def) => ({
      level: def.level,
      age: def.age,
      name: def.name,
      description: def.description,
      durationLabel: def.durationLabel,
    }));
  }

  private async ensureProgress(userId: string): Promise<TierProgress> {
    let progress = await this.progressRepo.findOne({ where: { userId } });
    if (!progress) {
      progress = this.progressRepo.create({
        userId,
        currentLevel: 1,
        currentAge: 1,
        currentTierName: 'Tohum',
        xp: '0',
        xpToNextLevel: xpRequiredForLevel(2).toString(),
        achievements: null,
      });
      progress = await this.progressRepo.save(progress);
    }

    // Lazy cross-service sync: game-server's `player_levels` table is the
    // live source of truth for XP/level (its POST /api/progression/award-xp
    // updates it on every action), but this api's `tier_progression` table
    // was built before that and only gets written by /tier/level-up here.
    // Without this catch-up, UI components that read /api/v1/tier/progress
    // (HUD level pill, /base wizard, /tier-up gate) show level 1 forever
    // even after the player has actually grinded to level 10+.
    //
    // Pull-on-read avoids a cross-service event bus: we accept a slightly
    // stale read in exchange for not coupling game-server to api. The full
    // fix is a refactor that picks one source of truth — see the spawn-task
    // chip from the autoplay session.
    try {
      const rows = await this.dataSource.query<{ current_level: number; current_age: number; current_xp: number; total_xp: number }[]>(
        `SELECT current_level, current_age, current_xp, total_xp FROM player_levels WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      const live = rows?.[0];
      if (live && live.current_level > progress.currentLevel) {
        // total_xp is cumulative across all levels; tier_progression.xp is the
        // remainder above the current threshold, but for view purposes we
        // surface the live number directly. The math reconciles because
        // levelUp() is no longer the canonical level-up path — game-server is.
        progress.currentLevel = live.current_level;
        progress.currentAge = live.current_age;
        progress.xp = String(live.current_xp);
        progress.currentTierName = resolveTierName(live.current_level, null);
        progress.xpToNextLevel =
          live.current_level >= MAX_TIER_LEVEL
            ? '0'
            : xpRequiredForLevel(live.current_level + 1).toString();
        await this.progressRepo.save(progress);
      }
    } catch (err) {
      this.logger.warn(`player_levels sync skipped for ${userId}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return progress;
  }

  private toView(progress: TierProgress, race: Race | null): TierProgressView {
    const raceSpecific =
      progress.currentLevel === MAX_TIER_LEVEL && race
        ? resolveTierName(MAX_TIER_LEVEL, race)
        : null;
    // Compute xpToNextLevel from the current level rather than trusting the
    // stored column. The lazy sync only writes when state moves forward, so
    // any time the player's level moved back (admin reset, prestige, etc.)
    // the column lingers with a stale threshold from the higher level. The
    // function is the source of truth — `xpRequiredForLevel(L) = 100*L²` —
    // and it's cheap to evaluate. Cap at MAX_TIER_LEVEL with '0'.
    const xpToNext =
      progress.currentLevel >= MAX_TIER_LEVEL
        ? '0'
        : xpRequiredForLevel(progress.currentLevel + 1).toString();
    return {
      userId: progress.userId,
      currentLevel: progress.currentLevel,
      currentAge: progress.currentAge,
      currentTierName: progress.currentTierName,
      raceSpecificTierName: raceSpecific,
      xp: progress.xp,
      xpToNextLevel: xpToNext,
      isMaxLevel: progress.currentLevel >= MAX_TIER_LEVEL,
      achievements: progress.achievements,
    };
  }
}
