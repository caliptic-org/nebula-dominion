export interface StreakDayReward {
  day: number;
  mineral?: number;
  gas?: number;
  energy?: number;
  premiumCurrency?: number;
  isPremiumItem: boolean;
  itemDescription?: string;
}

export const STREAK_REWARDS: StreakDayReward[] = [
  { day: 1, mineral: 100, isPremiumItem: false },
  { day: 2, gas: 200, isPremiumItem: false },
  { day: 3, isPremiumItem: true, itemDescription: 'Commander skin or 1 battle boost' },
  { day: 4, energy: 300, isPremiumItem: false },
  { day: 5, mineral: 500, gas: 500, isPremiumItem: false },
  { day: 6, isPremiumItem: true, itemDescription: 'Rare unit blueprint' },
  { day: 7, isPremiumItem: true, premiumCurrency: 500, itemDescription: 'Exclusive content or 500 premium currency' },
];

export const STREAK_CYCLE = 7;
// Weekly rescue token grant — 1 token per 7-day window
export const RESCUE_TOKENS_PER_WEEK = 1;
