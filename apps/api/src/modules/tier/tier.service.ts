import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  constructor(
    @InjectRepository(TierProgress)
    private readonly progressRepo: Repository<TierProgress>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
    return progress;
  }

  private toView(progress: TierProgress, race: Race | null): TierProgressView {
    const raceSpecific =
      progress.currentLevel === MAX_TIER_LEVEL && race
        ? resolveTierName(MAX_TIER_LEVEL, race)
        : null;
    return {
      userId: progress.userId,
      currentLevel: progress.currentLevel,
      currentAge: progress.currentAge,
      currentTierName: progress.currentTierName,
      raceSpecificTierName: raceSpecific,
      xp: progress.xp,
      xpToNextLevel: progress.xpToNextLevel,
      isMaxLevel: progress.currentLevel >= MAX_TIER_LEVEL,
      achievements: progress.achievements,
    };
  }
}
