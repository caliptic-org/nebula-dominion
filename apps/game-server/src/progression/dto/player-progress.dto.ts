import { AgeTierBadge, ContentUnlock } from '../config/level-config';

export interface LevelUpEvent {
  userId: string;
  previousLevel: number;
  newLevel: number;
  age: number;
  tier: number;
  newUnlocks: ContentUnlock[];
  rewards: { gold?: number; gems?: number; title?: string; badge?: string };
  eraTransitionPackage?: EraTransitionPackage;
}

export interface AgeTransitionEvent {
  userId: string;
  previousAge: number;
  newAge: number;
  totalXpAtTransition: number;
  // badge_upgrade payload sent to Frontend
  badge_upgrade: {
    previousBadgeTier: AgeTierBadge | null;
    newBadgeTier: AgeTierBadge;
    badgeLabel: string;
  };
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

export interface XpTelemetryEvent {
  userId: string;
  source: string;
  baseAmount: number;
  finalAmount: number;
  level: number;
  age: number;
  totalXp: number;
  timestamp: string;
}

export class PlayerProgressDto {
  userId: string;
  age: number;
  level: number;
  tier: number;
  badgeTier: AgeTierBadge;
  currentXp: number;
  totalXp: number;
  xpToNextLevel: number | null;
  xpProgressPercent: number;
  unlockedContent: ContentUnlock[];
  tierBonusMultiplier: number;
  isMaxLevel: boolean;
  canAdvanceAge: boolean;
}
