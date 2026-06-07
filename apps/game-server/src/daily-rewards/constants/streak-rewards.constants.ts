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
  // Cycle-18 MON-8 — day-7 previously advertised `premiumCurrency: 500` but
  // NOTHING in the streak path writes user_currency.premium_gems (the
  // claim only emits an event the socket re-broadcasts; no wallet credit),
  // so the single biggest weekly milestone promised an undelivered gem
  // payout. Wiring a real 500-gem/week faucet would ~triple the F2P gem
  // supply and needs a deliberate monetization re-balance (tracked
  // separately); until then the day-7 copy is made HONEST — a concrete,
  // milestone-sized resource reward consistent with what the system
  // actually delivers, with no phantom premium-currency promise.
  { day: 7, mineral: 1000, gas: 1000, energy: 500, isPremiumItem: true, itemDescription: 'Haftalık kilometre taşı: büyük kaynak paketi' },
];

export const STREAK_CYCLE = 7;
// Weekly rescue token grant — 1 token per 7-day window
export const RESCUE_TOKENS_PER_WEEK = 1;
