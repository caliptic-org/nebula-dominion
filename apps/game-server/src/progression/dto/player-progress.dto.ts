import { ContentUnlock } from '../config/level-config';

export interface LevelUpEvent {
  userId: string;
  previousLevel: number;
  newLevel: number;
  age: number;
  tier: number;
  newUnlocks: ContentUnlock[];
  rewards: { gold?: number; gems?: number; title?: string; badge?: string };
}

export interface XpGainedEvent {
  userId: string;
  xpGained: number;
  source: string;
  currentXp: number;
  xpToNext: number | null;
  currentLevel: number;
  age: number;
}

export class PlayerProgressDto {
  userId: string;
  age: number;
  level: number;
  tier: number;
  currentXp: number;
  totalXp: number;
  xpToNextLevel: number | null;
  xpProgressPercent: number;
  unlockedContent: ContentUnlock[];
  tierBonusMultiplier: number;
  isMaxLevel: boolean;
}
