export enum ContentUnlock {
  RACE_ZERG = 'race_zerg',
  RACE_AUTOMATON = 'race_automaton',
  RACE_MONSTER_PREVIEW = 'race_monster_preview',
  MODE_RANKED = 'mode_ranked',
  CONSTRUCTION_BASICS = 'construction_basics',
  ADVANCED_ABILITIES = 'advanced_abilities',
  SPECIAL_MAPS = 'special_maps',
  ADVANCED_TACTICS = 'advanced_tactics',
  AGE_2_PREVIEW = 'age_2_preview',
}

export const UNLOCK_LABELS: Record<ContentUnlock, string> = {
  [ContentUnlock.RACE_ZERG]: 'Zerg Irkı',
  [ContentUnlock.RACE_AUTOMATON]: 'Automaton Irkı',
  [ContentUnlock.RACE_MONSTER_PREVIEW]: 'Monster Önizleme',
  [ContentUnlock.MODE_RANKED]: 'Ranked Mod',
  [ContentUnlock.CONSTRUCTION_BASICS]: 'Yapı İnşası',
  [ContentUnlock.ADVANCED_ABILITIES]: 'Gelişmiş Yetenekler',
  [ContentUnlock.SPECIAL_MAPS]: 'Özel Haritalar',
  [ContentUnlock.ADVANCED_TACTICS]: 'Gelişmiş Taktikler',
  [ContentUnlock.AGE_2_PREVIEW]: 'Çağ 2 Önizleme',
};

export const TIER_NAMES: Record<number, string> = {
  1: 'Acemi',
  2: 'Deneyimli',
  3: 'Şampiyon',
};

export interface PlayerProgress {
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

export interface LevelUpPayload {
  previousLevel: number;
  newLevel: number;
  age: number;
  tier: number;
  newUnlocks: ContentUnlock[];
  rewards: { gold?: number; gems?: number; title?: string; badge?: string };
}

export interface XpGainedPayload {
  xpGained: number;
  source: string;
  currentXp: number;
  xpToNext: number | null;
  currentLevel: number;
  age: number;
}

export interface AgeTransitionPayload {
  /** The age the player is transitioning into (1–6). */
  toAge: number;
  race: string;
  raceColor: string;
  raceGlow: string;
  newUnlocks: ContentUnlock[];
  /** Absolute URL or path to a scene image (Image Generator output). */
  sceneImageSrc?: string;
  /** Auto-advance after this many ms. Defaults to 10 000. Set 0 to disable. */
  autoAdvanceMs?: number;
  onComplete: () => void;
}
