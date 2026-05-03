import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoginStreak } from './entities/login-streak.entity';
import { PlayerDailyQuest } from './entities/player-daily-quest.entity';
import { LootBoxAward } from './entities/loot-box-award.entity';
import {
  STREAK_REWARDS,
  STREAK_CYCLE,
  RESCUE_TOKENS_PER_WEEK,
} from './constants/streak-rewards.constants';
import { QUEST_POOL, DAILY_QUEST_COUNT } from './constants/quest-pool.constants';
import { rollLootBox } from './constants/loot-box.constants';
import {
  StreakStatusDto,
  ClaimStreakResultDto,
  DailyQuestDto,
  DailyQuestsStatusDto,
  LootBoxDto,
} from './dto/daily-rewards.dto';

function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.round(Math.abs(b - a) / 86400000);
}

@Injectable()
export class DailyRewardsService {
  private readonly logger = new Logger(DailyRewardsService.name);

  constructor(
    @InjectRepository(LoginStreak)
    private readonly streakRepo: Repository<LoginStreak>,
    @InjectRepository(PlayerDailyQuest)
    private readonly questRepo: Repository<PlayerDailyQuest>,
    @InjectRepository(LootBoxAward)
    private readonly lootBoxRepo: Repository<LootBoxAward>,
    private readonly emitter: EventEmitter2,
  ) {}

  // ─── Login Streak ──────────────────────────────────────────────────────────

  private async getOrCreateStreak(userId: string): Promise<LoginStreak> {
    let streak = await this.streakRepo.findOne({ where: { userId } });
    if (!streak) {
      streak = this.streakRepo.create({ userId });
      await this.streakRepo.save(streak);
    }
    return streak;
  }

  async getStreakStatus(userId: string): Promise<StreakStatusDto> {
    const streak = await this.getOrCreateStreak(userId);
    const today = utcDateString();
    const todayClaimed = streak.lastClaimedDate === today;
    const rewardDay = ((streak.currentStreak - 1 + STREAK_CYCLE) % STREAK_CYCLE) + 1;

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastClaimedDate: streak.lastClaimedDate,
      rescueTokens: streak.rescueTokens,
      todayClaimed,
      todayRewardDay: todayClaimed ? rewardDay : ((streak.currentStreak % STREAK_CYCLE) + 1),
    };
  }

  async claimDailyStreak(userId: string, useRescueToken = false): Promise<ClaimStreakResultDto> {
    const streak = await this.getOrCreateStreak(userId);
    const today = utcDateString();

    if (streak.lastClaimedDate === today) {
      return this.buildClaimResult(streak, false, false);
    }

    const yesterday = utcDateString(new Date(Date.now() - 86400000));
    const lastClaimed = streak.lastClaimedDate;
    let usedRescueToken = false;

    if (!lastClaimed) {
      // First ever claim
      streak.currentStreak = 1;
    } else if (lastClaimed === yesterday) {
      // Consecutive day
      streak.currentStreak += 1;
    } else {
      const gap = daysBetween(lastClaimed, today);
      if (gap === 2 && streak.rescueTokens > 0 && useRescueToken) {
        // Player missed exactly 1 day and has a rescue token
        streak.currentStreak += 1;
        streak.rescueTokens -= 1;
        usedRescueToken = true;
        this.logger.log(`Rescue token used: userId=${userId} streak=${streak.currentStreak}`);
      } else {
        // Streak broken
        streak.currentStreak = 1;
      }
    }

    streak.lastClaimedDate = today;
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);

    // Grant weekly rescue token if eligible (once per 7 days)
    this.maybeGrantWeeklyRescueToken(streak);

    await this.streakRepo.save(streak);

    const result = this.buildClaimResult(streak, true, usedRescueToken);
    this.emitter.emit('daily_rewards.streak_claimed', { userId, streak: streak.currentStreak, reward: result });
    this.logger.log(`Streak claimed: userId=${userId} streak=${streak.currentStreak}`);

    return result;
  }

  private maybeGrantWeeklyRescueToken(streak: LoginStreak): void {
    const now = new Date();
    const lastGrant = streak.weeklyRescueGrantedAt;
    const sevenDaysMs = 7 * 86400000;

    if (!lastGrant || now.getTime() - lastGrant.getTime() >= sevenDaysMs) {
      streak.rescueTokens = Math.min(streak.rescueTokens + RESCUE_TOKENS_PER_WEEK, 3);
      streak.weeklyRescueGrantedAt = now;
    }
  }

  private buildClaimResult(streak: LoginStreak, claimed: boolean, usedRescueToken: boolean): ClaimStreakResultDto {
    const rewardDay = ((streak.currentStreak - 1 + STREAK_CYCLE) % STREAK_CYCLE) + 1;
    const reward = STREAK_REWARDS[rewardDay - 1];

    return {
      success: claimed,
      currentStreak: streak.currentStreak,
      rewardDay,
      mineral: reward?.mineral,
      gas: reward?.gas,
      energy: reward?.energy,
      premiumCurrency: reward?.premiumCurrency,
      isPremiumItem: reward?.isPremiumItem ?? false,
      itemDescription: reward?.itemDescription,
      usedRescueToken,
      rescueTokensRemaining: streak.rescueTokens,
    };
  }

  // ─── Daily Quests ──────────────────────────────────────────────────────────

  async getDailyQuests(userId: string, playerAge: number): Promise<DailyQuestsStatusDto> {
    const today = utcDateString();
    let quests = await this.questRepo.find({ where: { userId, questDate: today } });

    if (quests.length === 0) {
      quests = await this.generateQuestsForToday(userId, playerAge, today);
    }

    const allCompleted = quests.length > 0 && quests.every((q) => q.completed);
    const lootBoxAwarded = allCompleted
      ? (await this.lootBoxRepo.count({ where: { userId, source: `daily_quest_${today}` } })) > 0
      : false;

    return {
      date: today,
      quests: quests.map(this.toQuestDto),
      allCompleted,
      lootBoxAwarded,
    };
  }

  private async generateQuestsForToday(
    userId: string,
    playerAge: number,
    date: string,
  ): Promise<PlayerDailyQuest[]> {
    const eligible = QUEST_POOL.filter((q) => q.minAge <= playerAge && q.maxAge >= playerAge);

    // Shuffle deterministically based on userId + date to be reproducible but varied
    const seed = this.hashCode(`${userId}-${date}`);
    const shuffled = [...eligible].sort(() => this.seededRandom(seed) - 0.5);
    const selected = shuffled.slice(0, Math.min(DAILY_QUEST_COUNT, shuffled.length));

    const entities = selected.map((template) =>
      this.questRepo.create({
        userId,
        questDate: date,
        questType: template.type,
        description: template.description,
        targetAmount: template.targetAmount,
        xpReward: template.xpReward,
        mineralReward: template.mineralReward,
        gasReward: template.gasReward,
        energyReward: template.energyReward,
        awardsLootBox: template.awardsLootBox,
      }),
    );

    await this.questRepo.save(entities);
    this.logger.log(`Generated ${entities.length} daily quests for userId=${userId} date=${date}`);
    return entities;
  }

  async recordQuestProgress(userId: string, questType: string, amount: number): Promise<DailyQuestDto | null> {
    const today = utcDateString();
    const quest = await this.questRepo.findOne({ where: { userId, questDate: today, questType } });
    if (!quest || quest.completed) return null;

    quest.progress = Math.min(quest.progress + amount, quest.targetAmount);
    if (quest.progress >= quest.targetAmount) {
      quest.completed = true;
      this.emitter.emit('daily_rewards.quest_completed', {
        userId,
        questType,
        xpReward: quest.xpReward,
        mineralReward: quest.mineralReward,
        gasReward: quest.gasReward,
        energyReward: quest.energyReward,
      });
      this.logger.log(`Quest completed: userId=${userId} type=${questType}`);

      // Check if all quests are done → award loot box
      await this.questRepo.save(quest);
      await this.maybeAwardDailyLootBox(userId, today);
    } else {
      await this.questRepo.save(quest);
    }

    return this.toQuestDto(quest);
  }

  private async maybeAwardDailyLootBox(userId: string, date: string): Promise<void> {
    const quests = await this.questRepo.find({ where: { userId, questDate: date } });
    if (!quests.every((q) => q.completed)) return;

    const alreadyAwarded = await this.lootBoxRepo.count({ where: { userId, source: `daily_quest_${date}` } });
    if (alreadyAwarded > 0) return;

    const lootBox = await this.awardLootBox(userId, `daily_quest_${date}`);
    this.emitter.emit('daily_rewards.loot_box_awarded', { userId, lootBoxId: lootBox.id, source: lootBox.source });
    this.logger.log(`Loot box awarded: userId=${userId} source=daily_quest_${date}`);
  }

  // ─── Loot Box ──────────────────────────────────────────────────────────────

  async awardLootBox(userId: string, source: string): Promise<LootBoxAward> {
    const items = rollLootBox(3);
    const award = this.lootBoxRepo.create({ userId, source, items });
    return this.lootBoxRepo.save(award);
  }

  async getUnopenedLootBoxes(userId: string): Promise<LootBoxDto[]> {
    const boxes = await this.lootBoxRepo.find({ where: { userId, opened: false }, order: { createdAt: 'ASC' } });
    return boxes.map((b) => ({ id: b.id, source: b.source, items: b.items, opened: b.opened }));
  }

  async openLootBox(userId: string, lootBoxId: string): Promise<LootBoxDto | null> {
    const box = await this.lootBoxRepo.findOne({ where: { id: lootBoxId, userId } });
    if (!box || box.opened) return null;

    box.opened = true;
    box.openedAt = new Date();
    await this.lootBoxRepo.save(box);

    this.emitter.emit('daily_rewards.loot_box_opened', { userId, lootBoxId, items: box.items });
    return { id: box.id, source: box.source, items: box.items, opened: box.opened };
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  private toQuestDto(quest: PlayerDailyQuest): DailyQuestDto {
    return {
      id: quest.id,
      questType: quest.questType,
      description: quest.description,
      targetAmount: quest.targetAmount,
      progress: quest.progress,
      completed: quest.completed,
      xpReward: quest.xpReward,
      mineralReward: quest.mineralReward,
      gasReward: quest.gasReward,
      energyReward: quest.energyReward,
      awardsLootBox: quest.awardsLootBox,
    };
  }

  private hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }
}
