export enum QuestType {
  PRODUCE_UNIT = 'produce_unit',
  PVP_MATCH = 'pvp_match',
  COLLECT_RESOURCES = 'collect_resources',
  GUILD_INTERACTION = 'guild_interaction',
  BATTLE_WIN = 'battle_win',
}

export enum StreakRewardType {
  RESOURCES = 'resources',
  RARE_UNIT_SHARD = 'rare_unit_shard',
  PREMIUM_CURRENCY = 'premium_currency',
  EPIC_ITEM = 'epic_item',
}

export interface QuestDefinition {
  type: QuestType;
  title: string;
  description: string;
  requirement: number;
  progress: number;
  completed: boolean;
  completedAt?: string;
}

export interface StreakReward {
  day: number;
  type: StreakRewardType;
  amount: number;
  claimed: boolean;
  claimedAt?: string;
}

// 7-day rotating reward cycle; repeats indefinitely
export const STREAK_REWARDS: Record<number, { type: StreakRewardType; amount: number }> = {
  1: { type: StreakRewardType.RESOURCES, amount: 100 },
  2: { type: StreakRewardType.RESOURCES, amount: 150 },
  3: { type: StreakRewardType.RARE_UNIT_SHARD, amount: 1 },
  4: { type: StreakRewardType.RESOURCES, amount: 200 },
  5: { type: StreakRewardType.RESOURCES, amount: 250 },
  6: { type: StreakRewardType.RESOURCES, amount: 300 },
  7: { type: StreakRewardType.PREMIUM_CURRENCY, amount: 50 },
};

export const DAILY_QUEST_TEMPLATES: Array<{
  type: QuestType;
  title: string;
  description: string;
  requirement: number;
}> = [
  {
    type: QuestType.PRODUCE_UNIT,
    title: '1 Birim Üret',
    description: 'Herhangi bir birim üret',
    requirement: 1,
  },
  {
    type: QuestType.PVP_MATCH,
    title: '1 PvP Maç Oyna',
    description: 'Bir PvP maçı tamamla',
    requirement: 1,
  },
  {
    type: QuestType.COLLECT_RESOURCES,
    title: '10 Kaynak Topla',
    description: 'Toplam 10 kaynak topla',
    requirement: 10,
  },
  {
    type: QuestType.GUILD_INTERACTION,
    title: 'Lonca Üyesiyle Etkileşim',
    description: 'Bir lonca üyesiyle etkileşime geç',
    requirement: 1,
  },
  {
    type: QuestType.BATTLE_WIN,
    title: '1 Savaş Kazan',
    description: 'Bir savaşı kazan',
    requirement: 1,
  },
];

// 30 minutes per stamina point
export const STAMINA_REGEN_MINUTES = 30;
export const MAX_STAMINA = 10;
