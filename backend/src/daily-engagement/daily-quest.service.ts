import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyQuestProfile } from './entities/daily-quest-profile.entity';
import { PlayerWalletService } from './player-wallet.service';
import { DAILY_QUEST_TEMPLATES, QuestDefinition } from './types/daily-engagement.types';
import { UpdateQuestProgressDto } from './dto/update-quest-progress.dto';

const BONUS_CHEST_REWARDS = { resources: 500, rare_shards: 2, premium_currency: 10 };
const DAILY_QUEST_COUNT = 4;

@Injectable()
export class DailyQuestService {
  constructor(
    @InjectRepository(DailyQuestProfile)
    private readonly profileRepo: Repository<DailyQuestProfile>,
    private readonly walletService: PlayerWalletService,
  ) {}

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Deterministic shuffle seeded by date + playerId so each player gets a consistent
  // but unique quest rotation that changes every day.
  private seedForPlayer(playerId: string): number {
    const key = `${this.getTodayDate()}:${playerId}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = Math.imul(31, hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private seededShuffle<T>(arr: T[], seed: number): T[] {
    let s = seed;
    const rand = () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0x100000000;
    };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private generateDailyQuests(playerId: string): QuestDefinition[] {
    const seed = this.seedForPlayer(playerId);
    const shuffled = this.seededShuffle([...DAILY_QUEST_TEMPLATES], seed);
    return shuffled.slice(0, DAILY_QUEST_COUNT).map((t) => ({
      type: t.type,
      title: t.title,
      description: t.description,
      requirement: t.requirement,
      progress: 0,
      completed: false,
    }));
  }

  async getOrCreateProfile(playerId: string): Promise<DailyQuestProfile> {
    let profile = await this.profileRepo.findOne({ where: { playerId } });
    const today = this.getTodayDate();

    if (!profile) {
      profile = this.profileRepo.create({
        playerId,
        questDate: today,
        quests: this.generateDailyQuests(playerId),
        bonusChestClaimed: false,
      });
      return this.profileRepo.save(profile);
    }

    // Auto-reset when a new day begins
    if (profile.questDate !== today) {
      profile.questDate = today;
      profile.quests = this.generateDailyQuests(playerId);
      profile.bonusChestClaimed = false;
      return this.profileRepo.save(profile);
    }

    return profile;
  }

  async updateProgress(playerId: string, dto: UpdateQuestProgressDto): Promise<DailyQuestProfile> {
    const profile = await this.getOrCreateProfile(playerId);
    const idx = profile.quests.findIndex((q) => q.type === dto.questType);

    if (idx === -1) {
      throw new NotFoundException(`Quest type "${dto.questType}" not in today's quest set`);
    }

    const quest = { ...profile.quests[idx] };
    if (quest.completed) {
      return profile;
    }

    quest.progress = Math.min(quest.progress + dto.increment, quest.requirement);
    if (quest.progress >= quest.requirement) {
      quest.completed = true;
      quest.completedAt = new Date().toISOString();
    }

    // Replace immutably to trigger TypeORM jsonb column change detection
    profile.quests = profile.quests.map((q, i) => (i === idx ? quest : q));
    return this.profileRepo.save(profile);
  }

  async claimBonusChest(playerId: string): Promise<{ rewards: typeof BONUS_CHEST_REWARDS }> {
    const profile = await this.getOrCreateProfile(playerId);

    if (!profile.quests.every((q) => q.completed)) {
      throw new BadRequestException('All daily quests must be completed before claiming the bonus chest');
    }

    if (profile.bonusChestClaimed) {
      throw new BadRequestException('Bonus chest already claimed today');
    }

    // Transfer rewards to wallet BEFORE marking as claimed
    await this.walletService.creditBundle(
      playerId,
      BONUS_CHEST_REWARDS.resources,
      BONUS_CHEST_REWARDS.rare_shards,
      BONUS_CHEST_REWARDS.premium_currency,
    );

    profile.bonusChestClaimed = true;
    await this.profileRepo.save(profile);

    return { rewards: BONUS_CHEST_REWARDS };
  }
}
