import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginStreak } from './entities/login-streak.entity';
import { PlayerWalletService } from './player-wallet.service';
import { STREAK_REWARDS, StreakReward } from './types/daily-engagement.types';

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(LoginStreak)
    private readonly streakRepo: Repository<LoginStreak>,
    private readonly walletService: PlayerWalletService,
  ) {}

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  }

  private daysBetween(dateA: string, dateB: string): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((new Date(dateB).getTime() - new Date(dateA).getTime()) / msPerDay);
  }

  async getOrCreate(playerId: string): Promise<LoginStreak> {
    let streak = await this.streakRepo.findOne({ where: { playerId } });
    if (!streak) {
      streak = this.streakRepo.create({ playerId, pendingRewards: [] });
      streak = await this.streakRepo.save(streak);
    }
    return streak;
  }

  async recordLogin(playerId: string): Promise<{
    streak: LoginStreak;
    newStreakDay: boolean;
    streakBroken: boolean;
    currentDay: number;
  }> {
    const streak = await this.getOrCreate(playerId);
    const today = this.getTodayDate();

    // Idempotent: calling multiple times per day is a no-op
    if (streak.lastLoginDate === today) {
      return { streak, newStreakDay: false, streakBroken: false, currentDay: streak.currentStreak };
    }

    let newStreakDay = false;
    let streakBroken = false;

    if (!streak.lastLoginDate) {
      streak.currentStreak = 1;
      streak.streakStartDate = today;
      streak.gracePeriodUsed = false;
      newStreakDay = true;
    } else {
      const diff = this.daysBetween(streak.lastLoginDate, today);

      if (diff === 1) {
        streak.currentStreak += 1;
        streak.gracePeriodUsed = false;
        newStreakDay = true;
      } else if (diff === 2 && !streak.gracePeriodUsed) {
        // 1-day grace period: streak continues but grace is consumed
        streak.currentStreak += 1;
        streak.gracePeriodUsed = true;
        newStreakDay = true;
      } else {
        streak.currentStreak = 1;
        streak.streakStartDate = today;
        streak.gracePeriodUsed = false;
        streakBroken = streak.lastLoginDate !== null;
        newStreakDay = true;
      }
    }

    streak.lastLoginDate = today;

    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    if (newStreakDay) {
      const dayInCycle = ((streak.currentStreak - 1) % 7) + 1;
      const rewardDef = STREAK_REWARDS[dayInCycle];
      if (rewardDef) {
        const reward: StreakReward = {
          day: streak.currentStreak,
          type: rewardDef.type,
          amount: rewardDef.amount,
          claimed: false,
        };
        streak.pendingRewards = [...streak.pendingRewards, reward];
      }
    }

    const saved = await this.streakRepo.save(streak);
    return { streak: saved, newStreakDay, streakBroken, currentDay: saved.currentStreak };
  }

  async claimReward(playerId: string, streakDay: number): Promise<StreakReward> {
    const streak = await this.streakRepo.findOne({ where: { playerId } });
    if (!streak) throw new NotFoundException(`Streak not found for player ${playerId}`);

    const idx = streak.pendingRewards.findIndex((r) => r.day === streakDay && !r.claimed);
    if (idx === -1) {
      throw new BadRequestException(`No unclaimed reward for streak day ${streakDay}`);
    }

    const reward = streak.pendingRewards[idx];

    // Transfer reward to wallet BEFORE marking as claimed to prevent loss on failure
    await this.walletService.creditReward(playerId, reward.type, reward.amount);

    streak.pendingRewards[idx] = {
      ...reward,
      claimed: true,
      claimedAt: new Date().toISOString(),
    };
    await this.streakRepo.save(streak);
    return streak.pendingRewards[idx];
  }

  async findByPlayer(playerId: string): Promise<LoginStreak> {
    return this.getOrCreate(playerId);
  }
}
