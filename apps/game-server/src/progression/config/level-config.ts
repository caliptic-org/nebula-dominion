export enum XpSource {
  BATTLE_WIN = 'battle_win',
  BATTLE_LOSS = 'battle_loss',
  CONSTRUCTION = 'construction',
  QUEST_EASY = 'quest_easy',
  QUEST_MEDIUM = 'quest_medium',
  QUEST_HARD = 'quest_hard',
}

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

export interface LevelReward {
  gold?: number;
  gems?: number;
  title?: string;
  badge?: string;
}

export interface LevelDefinition {
  level: number;
  age: number;
  tier: number;
  xpToNext: number | null; // null = max level for this age
  xpMultiplier: number;
  unlocks: ContentUnlock[];
  rewards: LevelReward;
  description: string;
}

// Age 1 — Levels 1-9 (the first 9 of 54 total levels across 6 ages)
export const AGE_1_LEVELS: LevelDefinition[] = [
  {
    level: 1,
    age: 1,
    tier: 1,
    xpToNext: 500,
    xpMultiplier: 1.0,
    unlocks: [],
    rewards: {},
    description: 'Başlangıç seviyesi',
  },
  {
    level: 2,
    age: 1,
    tier: 1,
    xpToNext: 750,
    xpMultiplier: 1.0,
    unlocks: [ContentUnlock.RACE_ZERG],
    rewards: { gold: 500 },
    description: 'Zerg ırkı açıldı',
  },
  {
    level: 3,
    age: 1,
    tier: 1,
    xpToNext: 1000,
    xpMultiplier: 1.0,
    unlocks: [ContentUnlock.CONSTRUCTION_BASICS],
    rewards: { gold: 750, badge: 'novice_builder' },
    description: 'Yapı inşası temelleri açıldı — Tier 1 tamamlandı',
  },
  {
    level: 4,
    age: 1,
    tier: 2,
    xpToNext: 1250,
    xpMultiplier: 1.1,
    unlocks: [ContentUnlock.RACE_AUTOMATON, ContentUnlock.MODE_RANKED],
    rewards: { gold: 1000, gems: 10 },
    description: 'Automaton ırkı ve Ranked mod açıldı',
  },
  {
    level: 5,
    age: 1,
    tier: 2,
    xpToNext: 1500,
    xpMultiplier: 1.1,
    unlocks: [ContentUnlock.ADVANCED_ABILITIES],
    rewards: { gold: 1250, gems: 15 },
    description: 'Gelişmiş yetenekler açıldı',
  },
  {
    level: 6,
    age: 1,
    tier: 2,
    xpToNext: 1750,
    xpMultiplier: 1.1,
    unlocks: [ContentUnlock.SPECIAL_MAPS],
    rewards: { gold: 1500, gems: 20, badge: 'veteran_warrior' },
    description: 'Özel haritalar açıldı — Tier 2 tamamlandı',
  },
  {
    level: 7,
    age: 1,
    tier: 3,
    xpToNext: 2000,
    xpMultiplier: 1.25,
    unlocks: [ContentUnlock.RACE_MONSTER_PREVIEW],
    rewards: { gold: 2000, gems: 25 },
    description: 'Monster ırkı önizlemesi',
  },
  {
    level: 8,
    age: 1,
    tier: 3,
    xpToNext: 2500,
    xpMultiplier: 1.25,
    unlocks: [ContentUnlock.ADVANCED_TACTICS],
    rewards: { gold: 2500, gems: 30 },
    description: 'Gelişmiş taktikler açıldı',
  },
  {
    level: 9,
    age: 1,
    tier: 3,
    xpToNext: null,
    xpMultiplier: 1.25,
    unlocks: [ContentUnlock.AGE_2_PREVIEW],
    rewards: { gold: 5000, gems: 100, title: 'Çağ 1 Şampiyonu', badge: 'age_1_champion' },
    description: 'Çağ 1 tamamlandı — Tier 3 Şampiyonu',
  },
];

export const XP_BASE_AMOUNTS: Record<XpSource, number> = {
  [XpSource.BATTLE_WIN]: 150,
  [XpSource.BATTLE_LOSS]: 30,
  [XpSource.CONSTRUCTION]: 50,
  [XpSource.QUEST_EASY]: 75,
  [XpSource.QUEST_MEDIUM]: 150,
  [XpSource.QUEST_HARD]: 300,
};

export function getLevelDef(level: number, age = 1): LevelDefinition | undefined {
  if (age === 1) return AGE_1_LEVELS.find((l) => l.level === level);
  return undefined;
}

export function getMaxLevel(age = 1): number {
  if (age === 1) return 9;
  return 9;
}
