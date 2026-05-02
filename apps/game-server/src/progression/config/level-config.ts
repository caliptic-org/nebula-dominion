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
  AGE_2_BUILDINGS = 'age_2_buildings',
  AUTOMATA_ADVANCED_UNITS = 'automata_advanced_units',
  AUTOMATA_MUTATION_TIER2 = 'automata_mutation_tier2',
  BOSS_HYDRA_ENCOUNTER = 'boss_hydra_encounter',
  BOSS_TITAN_ENCOUNTER = 'boss_titan_encounter',
  AUTOMATA_ELITE_UNITS = 'automata_elite_units',
  RACE_MONSTER_FULL = 'race_monster_full',
  ONBOARDING_COMPLETE = 'onboarding_complete',
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

// Age 2 — Levels 10-18
export const AGE_2_LEVELS: LevelDefinition[] = [
  {
    level: 10,
    age: 2,
    tier: 4,
    xpToNext: 3500,
    xpMultiplier: 1.5,
    unlocks: [ContentUnlock.AGE_2_BUILDINGS],
    rewards: { gold: 5000, gems: 150 },
    description: 'Çağ 2 başlıyor — yeni yapılar açıldı',
  },
  {
    level: 11,
    age: 2,
    tier: 4,
    xpToNext: 4000,
    xpMultiplier: 1.5,
    unlocks: [ContentUnlock.AUTOMATA_ADVANCED_UNITS],
    rewards: { gold: 3000, gems: 50 },
    description: 'Gelişmiş Automata birimleri açıldı',
  },
  {
    level: 12,
    age: 2,
    tier: 4,
    xpToNext: 4500,
    xpMultiplier: 1.5,
    unlocks: [ContentUnlock.BOSS_HYDRA_ENCOUNTER],
    rewards: { gold: 3500, gems: 75, badge: 'boss_slayer' },
    description: 'İlk boss: Hidra karşılaşması açıldı — Tier 4 tamamlandı',
  },
  {
    level: 13,
    age: 2,
    tier: 5,
    xpToNext: 5000,
    xpMultiplier: 1.6,
    unlocks: [ContentUnlock.AUTOMATA_MUTATION_TIER2],
    rewards: { gold: 4000, gems: 100 },
    description: 'Automata Mutasyon Ağacı Tier 2 açıldı',
  },
  {
    level: 14,
    age: 2,
    tier: 5,
    xpToNext: 5500,
    xpMultiplier: 1.6,
    unlocks: [],
    rewards: { gold: 4500, gems: 100 },
    description: 'Savaş deneyimi artıyor',
  },
  {
    level: 15,
    age: 2,
    tier: 5,
    xpToNext: 6000,
    xpMultiplier: 1.6,
    unlocks: [ContentUnlock.BOSS_TITAN_ENCOUNTER],
    rewards: { gold: 5000, gems: 150, badge: 'titan_hunter' },
    description: 'Boss: Titan karşılaşması açıldı — Tier 5 tamamlandı',
  },
  {
    level: 16,
    age: 2,
    tier: 6,
    xpToNext: 7000,
    xpMultiplier: 1.75,
    unlocks: [ContentUnlock.AUTOMATA_ELITE_UNITS],
    rewards: { gold: 6000, gems: 200 },
    description: 'Automata Elite birimleri açıldı',
  },
  {
    level: 17,
    age: 2,
    tier: 6,
    xpToNext: 8000,
    xpMultiplier: 1.75,
    unlocks: [ContentUnlock.RACE_MONSTER_FULL],
    rewards: { gold: 7000, gems: 250 },
    description: 'Canavar ırkı tam erişimi açıldı',
  },
  {
    level: 18,
    age: 2,
    tier: 6,
    xpToNext: null,
    xpMultiplier: 1.75,
    unlocks: [ContentUnlock.ONBOARDING_COMPLETE],
    rewards: { gold: 15000, gems: 500, title: 'Çağ 2 Şampiyonu', badge: 'age_2_champion' },
    description: 'Çağ 2 tamamlandı — Tier 6 Şampiyonu',
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
  if (age === 2) return AGE_2_LEVELS.find((l) => l.level === level);
  return undefined;
}

export function getMaxLevel(age = 1): number {
  if (age === 1) return 9;
  if (age === 2) return 18;
  return 9;
}
