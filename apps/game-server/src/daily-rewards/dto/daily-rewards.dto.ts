export class StreakStatusDto {
  currentStreak: number;
  longestStreak: number;
  lastClaimedDate: string | null;
  rescueTokens: number;
  todayClaimed: boolean;
  /** Day index (1-7) for today's reward display */
  todayRewardDay: number;
}

export class ClaimStreakResultDto {
  success: boolean;
  currentStreak: number;
  rewardDay: number;
  mineral?: number;
  gas?: number;
  energy?: number;
  premiumCurrency?: number;
  isPremiumItem: boolean;
  itemDescription?: string;
  usedRescueToken: boolean;
  rescueTokensRemaining: number;
}

export class DailyQuestDto {
  id: string;
  questType: string;
  description: string;
  targetAmount: number;
  progress: number;
  completed: boolean;
  xpReward: number;
  mineralReward: number;
  gasReward: number;
  energyReward: number;
  awardsLootBox: boolean;
}

export class DailyQuestsStatusDto {
  date: string;
  quests: DailyQuestDto[];
  allCompleted: boolean;
  lootBoxAwarded: boolean;
}

export class QuestProgressDto {
  questType: string;
  amount: number;
}

export class LootBoxDto {
  id: string;
  source: string;
  items: object[];
  opened: boolean;
}
