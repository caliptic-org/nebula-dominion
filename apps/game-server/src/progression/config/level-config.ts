// ─── XP Sources ─────────────────────────────────────────────────────────────
export enum XpSource {
  // Legacy sources (backward compat)
  BATTLE_WIN = 'battle_win',
  BATTLE_LOSS = 'battle_loss',
  QUEST_EASY = 'quest_easy',
  QUEST_MEDIUM = 'quest_medium',
  QUEST_HARD = 'quest_hard',
  // Current sources
  DAILY_MISSION = 'daily_mission',   // 35% target weight
  PVE_WIN = 'pve_win',               // 25% combined PvE weight
  PVE_LOSS = 'pve_loss',
  PVP_WIN = 'pvp_win',               // 15% combined PvP weight (Age 3+)
  PVP_LOSS = 'pvp_loss',
  CONSTRUCTION = 'construction',     // 10%
  GUILD_ACTIVITY = 'guild_activity', // 10% (Age 3+)
  ACHIEVEMENT = 'achievement',       // 5%
  EVENT = 'event',
}

// XP source target distribution weights (for telemetry calibration)
export const XP_SOURCE_WEIGHTS: Record<XpSource, number> = {
  [XpSource.DAILY_MISSION]:   0.35,
  [XpSource.PVE_WIN]:         0.20,
  [XpSource.PVE_LOSS]:        0.05,
  [XpSource.PVP_WIN]:         0.10,
  [XpSource.PVP_LOSS]:        0.05,
  [XpSource.CONSTRUCTION]:    0.10,
  [XpSource.GUILD_ACTIVITY]:  0.10,
  [XpSource.ACHIEVEMENT]:     0.04,
  [XpSource.EVENT]:           0.01,
  // Legacy (mapped to nearest equivalent, not counted separately)
  [XpSource.BATTLE_WIN]:      0,
  [XpSource.BATTLE_LOSS]:     0,
  [XpSource.QUEST_EASY]:      0,
  [XpSource.QUEST_MEDIUM]:    0,
  [XpSource.QUEST_HARD]:      0,
};

export const XP_BASE_AMOUNTS: Record<XpSource, number> = {
  [XpSource.DAILY_MISSION]:   200,
  [XpSource.PVE_WIN]:         150,
  [XpSource.PVE_LOSS]:         30,
  [XpSource.PVP_WIN]:         200,
  [XpSource.PVP_LOSS]:         50,
  [XpSource.CONSTRUCTION]:     80,
  [XpSource.GUILD_ACTIVITY]:  100,
  [XpSource.ACHIEVEMENT]:     500,
  [XpSource.EVENT]:           300,
  // Legacy
  [XpSource.BATTLE_WIN]:      150,
  [XpSource.BATTLE_LOSS]:      30,
  [XpSource.QUEST_EASY]:       75,
  [XpSource.QUEST_MEDIUM]:    150,
  [XpSource.QUEST_HARD]:      300,
};

// ─── XP sources available by minimum age ────────────────────────────────────
export const XP_SOURCE_MIN_AGE: Partial<Record<XpSource, number>> = {
  [XpSource.PVP_WIN]:        3,
  [XpSource.PVP_LOSS]:       3,
  [XpSource.GUILD_ACTIVITY]: 3,
};

// ─── Cumulative XP thresholds ────────────────────────────────────────────────
// Total XP needed to start and complete each age. Seeded to DB via migration.
export const AGE_XP_THRESHOLDS: Record<number, { start: number; end: number; f2pDaysFrom: number; f2pDaysTo: number }> = {
  1: { start:       0, end:     5_500, f2pDaysFrom:   1, f2pDaysTo:   3 },
  2: { start:   5_500, end:    18_000, f2pDaysFrom:   4, f2pDaysTo:  10 },
  3: { start:  18_000, end:    52_000, f2pDaysFrom:  11, f2pDaysTo:  30 },
  4: { start:  52_000, end:   145_000, f2pDaysFrom:  31, f2pDaysTo:  65 },
  5: { start: 145_000, end:   380_000, f2pDaysFrom:  66, f2pDaysTo: 110 },
  6: { start: 380_000, end:   950_000, f2pDaysFrom: 111, f2pDaysTo: 150 },
};

// Intra-age XP growth factor: XP(L) = base_age × 1.18^(intra_level_index)
export const XP_GROWTH_FACTOR = 1.18;
export const ERA_CATCH_UP_PRODUCTION_MULTIPLIER = 2.0;

export const MAX_AGE = 6;
export const LEVELS_PER_AGE = 9;
export const MAX_LEVEL = MAX_AGE * LEVELS_PER_AGE; // 54

// ─── Tier badge categories ────────────────────────────────────────────────────
export enum AgeTierBadge {
  ACEMI     = 'acemi',      // Novice:     Ages 1–2
  DENEYIMLI = 'deneyimli',  // Experienced: Ages 3–4
  SAMPIYON  = 'sampiyon',   // Champion:    Ages 5–6
}

export function getAgeTierBadge(age: number): AgeTierBadge {
  if (age <= 2) return AgeTierBadge.ACEMI;
  if (age <= 4) return AgeTierBadge.DENEYIMLI;
  return AgeTierBadge.SAMPIYON;
}

/** Tier number within 1-18 range: tier = floor((level-1)/3) + 1 */
export function tierForLevel(level: number): number {
  return Math.floor((level - 1) / 3) + 1;
}

// ─── Content Unlocks ─────────────────────────────────────────────────────────
export enum ContentUnlock {
  // Age 1
  RACE_ZERG              = 'race_zerg',
  RACE_AUTOMATON         = 'race_automaton',
  RACE_MONSTER_PREVIEW   = 'race_monster_preview',
  MODE_RANKED            = 'mode_ranked',
  CONSTRUCTION_BASICS    = 'construction_basics',
  ADVANCED_ABILITIES     = 'advanced_abilities',
  SPECIAL_MAPS           = 'special_maps',
  ADVANCED_TACTICS       = 'advanced_tactics',
  AGE_2_PREVIEW          = 'age_2_preview',
  // Age 2
  AGE_2_BUILDINGS        = 'age_2_buildings',
  AUTOMATA_ADVANCED_UNITS  = 'automata_advanced_units',
  AUTOMATA_MUTATION_TIER2  = 'automata_mutation_tier2',
  BOSS_HYDRA_ENCOUNTER   = 'boss_hydra_encounter',
  BOSS_TITAN_ENCOUNTER   = 'boss_titan_encounter',
  AUTOMATA_ELITE_UNITS   = 'automata_elite_units',
  RACE_MONSTER_FULL      = 'race_monster_full',
  ONBOARDING_COMPLETE    = 'onboarding_complete',
  // Age 3
  PVP_RANKED_ACCESS      = 'pvp_ranked_access',
  GUILD_ACCESS           = 'guild_access',
  AGE_3_BUILDINGS        = 'age_3_buildings',
  BOSS_LEVIATHAN         = 'boss_leviathan',
  ALLIANCE_WAR           = 'alliance_war',
  AGE_4_PREVIEW          = 'age_4_preview',
  // Age 4
  SECTOR_WARS            = 'sector_wars',
  AGE_4_BUILDINGS        = 'age_4_buildings',
  ELITE_TOURNAMENT       = 'elite_tournament',
  BOSS_VOID_SENTINEL     = 'boss_void_sentinel',
  CROSS_SERVER_PVP       = 'cross_server_pvp',
  AGE_5_PREVIEW          = 'age_5_preview',
  // Age 5
  SUBSPACE_ACCESS        = 'subspace_access',
  AGE_5_BUILDINGS        = 'age_5_buildings',
  DIMENSION_RIFT         = 'dimension_rift',
  BOSS_OMEGA_PRIME       = 'boss_omega_prime',
  LEGEND_LEAGUE          = 'legend_league',
  AGE_6_PREVIEW          = 'age_6_preview',
  // Age 6
  LEGEND_MODE            = 'legend_mode',
  AGE_6_BUILDINGS        = 'age_6_buildings',
  NEBULA_DOMINION_RAID   = 'nebula_dominion_raid',
  BOSS_ETERNAL           = 'boss_eternal',
  GRANDMASTER_LEAGUE     = 'grandmaster_league',
}

// ─── Level definition ─────────────────────────────────────────────────────────
export interface LevelReward {
  gold?: number;
  gems?: number;
  title?: string;
  badge?: string;
  // Era catch-up package fields (only on era-transition levels)
  productionBoostHours?: number;
  unitPackCount?: number;
  premiumCurrency?: number;
}

export interface LevelDefinition {
  level: number;
  age: number;
  tier: number;
  xpToNext: number | null; // null = max level for this age
  xpMultiplier: number;    // bonus multiplier applied to XP earned at this level
  unlocks: ContentUnlock[];
  rewards: LevelReward;
  description: string;
  eraTransition?: boolean; // true for the first level of each new age
}

// ─── Age 1 — Levels 1-9 ─────────────────────────────────────────────────────
// Budget: 5,500 total XP | base ≈ 359
export const AGE_1_LEVELS: LevelDefinition[] = [
  {
    level: 1, age: 1, tier: 1, xpToNext: 359, xpMultiplier: 1.0,
    unlocks: [],
    rewards: {},
    description: 'Başlangıç seviyesi',
  },
  {
    level: 2, age: 1, tier: 1, xpToNext: 423, xpMultiplier: 1.0,
    unlocks: [ContentUnlock.RACE_ZERG],
    rewards: { gold: 500 },
    description: 'Zerg ırkı açıldı',
  },
  {
    level: 3, age: 1, tier: 1, xpToNext: 500, xpMultiplier: 1.0,
    unlocks: [ContentUnlock.CONSTRUCTION_BASICS],
    rewards: { gold: 750, badge: 'novice_builder' },
    description: 'Yapı inşası temelleri açıldı — Tier 1 tamamlandı',
  },
  {
    level: 4, age: 1, tier: 2, xpToNext: 590, xpMultiplier: 1.1,
    unlocks: [ContentUnlock.RACE_AUTOMATON, ContentUnlock.MODE_RANKED],
    rewards: { gold: 1000, gems: 10 },
    description: 'Automaton ırkı ve Ranked mod açıldı',
  },
  {
    level: 5, age: 1, tier: 2, xpToNext: 696, xpMultiplier: 1.1,
    unlocks: [ContentUnlock.ADVANCED_ABILITIES],
    rewards: { gold: 1250, gems: 15 },
    description: 'Gelişmiş yetenekler açıldı',
  },
  {
    level: 6, age: 1, tier: 2, xpToNext: 821, xpMultiplier: 1.1,
    unlocks: [ContentUnlock.SPECIAL_MAPS],
    rewards: { gold: 1500, gems: 20, badge: 'veteran_warrior' },
    description: 'Özel haritalar açıldı — Tier 2 tamamlandı',
  },
  {
    level: 7, age: 1, tier: 3, xpToNext: 969, xpMultiplier: 1.25,
    unlocks: [ContentUnlock.RACE_MONSTER_PREVIEW],
    rewards: { gold: 2000, gems: 25 },
    description: 'Monster ırkı önizlemesi',
  },
  {
    level: 8, age: 1, tier: 3, xpToNext: 1143, xpMultiplier: 1.25,
    unlocks: [ContentUnlock.ADVANCED_TACTICS],
    rewards: { gold: 2500, gems: 30 },
    description: 'Gelişmiş taktikler açıldı',
  },
  {
    level: 9, age: 1, tier: 3, xpToNext: null, xpMultiplier: 1.25,
    unlocks: [ContentUnlock.AGE_2_PREVIEW],
    rewards: { gold: 5000, gems: 100, title: 'Çağ 1 Şampiyonu', badge: 'age_1_champion' },
    description: 'Çağ 1 tamamlandı — Acemi Tier Şampiyonu',
  },
];

// ─── Age 2 — Levels 10-18 ────────────────────────────────────────────────────
// Budget: 12,500 XP | base ≈ 816
export const AGE_2_LEVELS: LevelDefinition[] = [
  {
    level: 10, age: 2, tier: 4, xpToNext: 816, xpMultiplier: 1.5,
    unlocks: [ContentUnlock.AGE_2_BUILDINGS],
    rewards: {
      gold: 5000,
      gems: 151,
      productionBoostHours: 24, // era catch-up: 24h x2 production boost
      unitPackCount: 5,          // era catch-up: 5 free units for new age
      premiumCurrency: 1,        // era catch-up: 1 premium currency token
    },
    description: 'Çağ 2 başlıyor — yeni yapılar açıldı',
    eraTransition: true,
  },
  {
    level: 11, age: 2, tier: 4, xpToNext: 962, xpMultiplier: 1.5,
    unlocks: [ContentUnlock.AUTOMATA_ADVANCED_UNITS],
    rewards: { gold: 3000, gems: 50 },
    description: 'Gelişmiş Automata birimleri açıldı',
  },
  {
    level: 12, age: 2, tier: 4, xpToNext: 1136, xpMultiplier: 1.5,
    unlocks: [ContentUnlock.BOSS_HYDRA_ENCOUNTER],
    rewards: { gold: 3500, gems: 75, badge: 'boss_slayer' },
    description: 'İlk boss: Hidra karşılaşması açıldı — Tier 4 tamamlandı',
  },
  {
    level: 13, age: 2, tier: 5, xpToNext: 1340, xpMultiplier: 1.6,
    unlocks: [ContentUnlock.AUTOMATA_MUTATION_TIER2],
    rewards: { gold: 4000, gems: 100 },
    description: 'Automata Mutasyon Ağacı Tier 2 açıldı',
  },
  {
    level: 14, age: 2, tier: 5, xpToNext: 1581, xpMultiplier: 1.6,
    unlocks: [],
    rewards: { gold: 4500, gems: 100 },
    description: 'Savaş deneyimi artıyor',
  },
  {
    level: 15, age: 2, tier: 5, xpToNext: 1866, xpMultiplier: 1.6,
    unlocks: [ContentUnlock.BOSS_TITAN_ENCOUNTER],
    rewards: { gold: 5000, gems: 150, badge: 'titan_hunter' },
    description: 'Boss: Titan karşılaşması açıldı — Tier 5 tamamlandı',
  },
  {
    level: 16, age: 2, tier: 6, xpToNext: 2202, xpMultiplier: 1.75,
    unlocks: [ContentUnlock.AUTOMATA_ELITE_UNITS],
    rewards: { gold: 6000, gems: 200 },
    description: 'Automata Elite birimleri açıldı',
  },
  {
    level: 17, age: 2, tier: 6, xpToNext: 2597, xpMultiplier: 1.75,
    unlocks: [ContentUnlock.RACE_MONSTER_FULL],
    rewards: { gold: 7000, gems: 250 },
    description: 'Canavar ırkı tam erişimi açıldı',
  },
  {
    level: 18, age: 2, tier: 6, xpToNext: null, xpMultiplier: 1.75,
    unlocks: [ContentUnlock.ONBOARDING_COMPLETE],
    rewards: { gold: 15000, gems: 500, title: 'Çağ 2 Şampiyonu', badge: 'age_2_champion' },
    description: 'Çağ 2 tamamlandı — Acemi Tier Şampiyonu',
  },
];

// ─── Age 3 — Levels 19-27 ────────────────────────────────────────────────────
// Budget: 34,000 XP | base ≈ 2,219
export const AGE_3_LEVELS: LevelDefinition[] = [
  {
    level: 19, age: 3, tier: 7, xpToNext: 2219, xpMultiplier: 2.0,
    unlocks: [ContentUnlock.PVP_RANKED_ACCESS, ContentUnlock.GUILD_ACCESS, ContentUnlock.AGE_3_BUILDINGS],
    rewards: { gold: 15000, gems: 600 },
    description: 'Çağ 3 başlıyor — PvP ve lonca erişimi açıldı',
  },
  {
    level: 20, age: 3, tier: 7, xpToNext: 2618, xpMultiplier: 2.0,
    unlocks: [],
    rewards: { gold: 8000, gems: 200 },
    description: 'Çağ 3 savaş deneyimi',
  },
  {
    level: 21, age: 3, tier: 7, xpToNext: 3088, xpMultiplier: 2.0,
    unlocks: [ContentUnlock.BOSS_LEVIATHAN],
    rewards: { gold: 10000, gems: 300, badge: 'leviathan_slayer' },
    description: 'Boss: Leviathan karşılaşması açıldı — Tier 7 tamamlandı',
  },
  {
    level: 22, age: 3, tier: 8, xpToNext: 3645, xpMultiplier: 2.2,
    unlocks: [ContentUnlock.ALLIANCE_WAR],
    rewards: { gold: 12000, gems: 350 },
    description: 'İttifak Savaşı açıldı',
  },
  {
    level: 23, age: 3, tier: 8, xpToNext: 4302, xpMultiplier: 2.2,
    unlocks: [],
    rewards: { gold: 14000, gems: 400 },
    description: 'İttifak güçleniyor',
  },
  {
    level: 24, age: 3, tier: 8, xpToNext: 5076, xpMultiplier: 2.2,
    unlocks: [],
    rewards: { gold: 16000, gems: 450, badge: 'alliance_warlord' },
    description: 'İttifak savaş komutanı — Tier 8 tamamlandı',
  },
  {
    level: 25, age: 3, tier: 9, xpToNext: 5990, xpMultiplier: 2.5,
    unlocks: [],
    rewards: { gold: 18000, gems: 500 },
    description: 'Üst segment savaşçı',
  },
  {
    level: 26, age: 3, tier: 9, xpToNext: 7067, xpMultiplier: 2.5,
    unlocks: [ContentUnlock.AGE_4_PREVIEW],
    rewards: { gold: 20000, gems: 600 },
    description: 'Çağ 4 önizlemesi açıldı',
  },
  {
    level: 27, age: 3, tier: 9, xpToNext: null, xpMultiplier: 2.5,
    unlocks: [],
    rewards: { gold: 30000, gems: 1000, title: 'Çağ 3 Şampiyonu', badge: 'age_3_champion' },
    description: 'Çağ 3 tamamlandı — Deneyimli Tier Şampiyonu',
  },
];

// ─── Age 4 — Levels 28-36 ────────────────────────────────────────────────────
// Budget: 93,000 XP | base ≈ 6,068
export const AGE_4_LEVELS: LevelDefinition[] = [
  {
    level: 28, age: 4, tier: 10, xpToNext: 6068, xpMultiplier: 2.8,
    unlocks: [ContentUnlock.SECTOR_WARS, ContentUnlock.AGE_4_BUILDINGS],
    rewards: { gold: 30000, gems: 1200 },
    description: 'Çağ 4 başlıyor — Sektör Savaşları açıldı',
  },
  {
    level: 29, age: 4, tier: 10, xpToNext: 7160, xpMultiplier: 2.8,
    unlocks: [],
    rewards: { gold: 20000, gems: 500 },
    description: 'Toprak kontrolü derinleşiyor',
  },
  {
    level: 30, age: 4, tier: 10, xpToNext: 8449, xpMultiplier: 2.8,
    unlocks: [ContentUnlock.ELITE_TOURNAMENT],
    rewards: { gold: 25000, gems: 700, badge: 'sector_conqueror' },
    description: 'Elit turnuva erişimi açıldı — Tier 10 tamamlandı',
  },
  {
    level: 31, age: 4, tier: 11, xpToNext: 9970, xpMultiplier: 3.0,
    unlocks: [ContentUnlock.BOSS_VOID_SENTINEL],
    rewards: { gold: 28000, gems: 800 },
    description: 'Boss: Void Sentinel karşılaşması açıldı',
  },
  {
    level: 32, age: 4, tier: 11, xpToNext: 11764, xpMultiplier: 3.0,
    unlocks: [],
    rewards: { gold: 30000, gems: 900 },
    description: 'Void güçleri zorlaşıyor',
  },
  {
    level: 33, age: 4, tier: 11, xpToNext: 13881, xpMultiplier: 3.0,
    unlocks: [],
    rewards: { gold: 35000, gems: 1000, badge: 'void_hunter' },
    description: 'Void avcısı — Tier 11 tamamlandı',
  },
  {
    level: 34, age: 4, tier: 12, xpToNext: 16380, xpMultiplier: 3.3,
    unlocks: [ContentUnlock.CROSS_SERVER_PVP],
    rewards: { gold: 40000, gems: 1100 },
    description: 'Sunucu ötesi PvP açıldı',
  },
  {
    level: 35, age: 4, tier: 12, xpToNext: 19328, xpMultiplier: 3.3,
    unlocks: [ContentUnlock.AGE_5_PREVIEW],
    rewards: { gold: 45000, gems: 1300 },
    description: 'Çağ 5 önizlemesi açıldı',
  },
  {
    level: 36, age: 4, tier: 12, xpToNext: null, xpMultiplier: 3.3,
    unlocks: [],
    rewards: { gold: 60000, gems: 2000, title: 'Çağ 4 Şampiyonu', badge: 'age_4_champion' },
    description: 'Çağ 4 tamamlandı — Deneyimli Tier Şampiyonu',
  },
];

// ─── Age 5 — Levels 37-45 ────────────────────────────────────────────────────
// Budget: 235,000 XP | base ≈ 15,334
export const AGE_5_LEVELS: LevelDefinition[] = [
  {
    level: 37, age: 5, tier: 13, xpToNext: 15334, xpMultiplier: 3.5,
    unlocks: [ContentUnlock.SUBSPACE_ACCESS, ContentUnlock.AGE_5_BUILDINGS],
    rewards: { gold: 60000, gems: 2500 },
    description: 'Çağ 5 başlıyor — Subspace boyutu açıldı',
  },
  {
    level: 38, age: 5, tier: 13, xpToNext: 18094, xpMultiplier: 3.5,
    unlocks: [],
    rewards: { gold: 40000, gems: 1000 },
    description: 'Boyutlararası keşif',
  },
  {
    level: 39, age: 5, tier: 13, xpToNext: 21351, xpMultiplier: 3.5,
    unlocks: [ContentUnlock.DIMENSION_RIFT],
    rewards: { gold: 50000, gems: 1500, badge: 'rift_walker' },
    description: 'Boyut yarığı açıldı — Tier 13 tamamlandı',
  },
  {
    level: 40, age: 5, tier: 14, xpToNext: 25194, xpMultiplier: 3.8,
    unlocks: [ContentUnlock.BOSS_OMEGA_PRIME],
    rewards: { gold: 55000, gems: 1700 },
    description: 'Boss: Omega Prime karşılaşması açıldı',
  },
  {
    level: 41, age: 5, tier: 14, xpToNext: 29729, xpMultiplier: 3.8,
    unlocks: [],
    rewards: { gold: 60000, gems: 2000 },
    description: 'Omega güçleri sürüyor',
  },
  {
    level: 42, age: 5, tier: 14, xpToNext: 35079, xpMultiplier: 3.8,
    unlocks: [],
    rewards: { gold: 65000, gems: 2200, badge: 'omega_slayer' },
    description: 'Omega katili — Tier 14 tamamlandı',
  },
  {
    level: 43, age: 5, tier: 15, xpToNext: 41396, xpMultiplier: 4.0,
    unlocks: [ContentUnlock.LEGEND_LEAGUE],
    rewards: { gold: 70000, gems: 2500 },
    description: 'Efsane ligi erişimi açıldı',
  },
  {
    level: 44, age: 5, tier: 15, xpToNext: 48847, xpMultiplier: 4.0,
    unlocks: [ContentUnlock.AGE_6_PREVIEW],
    rewards: { gold: 80000, gems: 3000 },
    description: 'Çağ 6 önizlemesi açıldı',
  },
  {
    level: 45, age: 5, tier: 15, xpToNext: null, xpMultiplier: 4.0,
    unlocks: [],
    rewards: { gold: 120000, gems: 5000, title: 'Çağ 5 Şampiyonu', badge: 'age_5_champion' },
    description: 'Çağ 5 tamamlandı — Şampiyon Tier Şampiyonu',
  },
];

// ─── Age 6 — Levels 46-54 ────────────────────────────────────────────────────
// Budget: 570,000 XP | base ≈ 37,189
export const AGE_6_LEVELS: LevelDefinition[] = [
  {
    level: 46, age: 6, tier: 16, xpToNext: 37189, xpMultiplier: 4.2,
    unlocks: [ContentUnlock.LEGEND_MODE, ContentUnlock.AGE_6_BUILDINGS],
    rewards: { gold: 120000, gems: 6000 },
    description: 'Çağ 6 başlıyor — Efsane modu açıldı',
  },
  {
    level: 47, age: 6, tier: 16, xpToNext: 43883, xpMultiplier: 4.2,
    unlocks: [],
    rewards: { gold: 80000, gems: 2000 },
    description: 'Efsane yolu derinleşiyor',
  },
  {
    level: 48, age: 6, tier: 16, xpToNext: 51779, xpMultiplier: 4.2,
    unlocks: [ContentUnlock.NEBULA_DOMINION_RAID],
    rewards: { gold: 100000, gems: 3000, badge: 'nebula_raider' },
    description: 'Nebula Dominion Baskını açıldı — Tier 16 tamamlandı',
  },
  {
    level: 49, age: 6, tier: 17, xpToNext: 61083, xpMultiplier: 4.5,
    unlocks: [ContentUnlock.BOSS_ETERNAL],
    rewards: { gold: 120000, gems: 4000 },
    description: 'Boss: Eternal karşılaşması açıldı',
  },
  {
    level: 50, age: 6, tier: 17, xpToNext: 72097, xpMultiplier: 4.5,
    unlocks: [],
    rewards: { gold: 140000, gems: 5000 },
    description: 'Ebedi güçlerle mücadele',
  },
  {
    level: 51, age: 6, tier: 17, xpToNext: 85074, xpMultiplier: 4.5,
    unlocks: [],
    rewards: { gold: 160000, gems: 6000, badge: 'eternal_slayer' },
    description: 'Ebedi katili — Tier 17 tamamlandı',
  },
  {
    level: 52, age: 6, tier: 18, xpToNext: 100387, xpMultiplier: 5.0,
    unlocks: [ContentUnlock.GRANDMASTER_LEAGUE],
    rewards: { gold: 200000, gems: 8000 },
    description: 'Grandmaster ligi açıldı',
  },
  {
    level: 53, age: 6, tier: 18, xpToNext: 118487, xpMultiplier: 5.0,
    unlocks: [],
    rewards: { gold: 250000, gems: 10000 },
    description: 'Efsane zirvesine yaklaşıyor',
  },
  {
    level: 54, age: 6, tier: 18, xpToNext: null, xpMultiplier: 5.0,
    unlocks: [],
    rewards: { gold: 500000, gems: 25000, title: 'Nebula Dominion Efsanesi', badge: 'nebula_legend' },
    description: 'Maksimum seviye — Tüm çağlar tamamlandı',
  },
];

// ─── Combined lookup ──────────────────────────────────────────────────────────
const ALL_LEVELS: LevelDefinition[] = [
  ...AGE_1_LEVELS,
  ...AGE_2_LEVELS,
  ...AGE_3_LEVELS,
  ...AGE_4_LEVELS,
  ...AGE_5_LEVELS,
  ...AGE_6_LEVELS,
];

const LEVEL_MAP = new Map<number, LevelDefinition>(ALL_LEVELS.map((l) => [l.level, l]));

export function getLevelDef(level: number, _age?: number): LevelDefinition | undefined {
  return LEVEL_MAP.get(level);
}

/** Returns global level number of the last level in the given age (e.g., age 1 → 9). */
export function getMaxLevel(age: number): number {
  return age * LEVELS_PER_AGE;
}

/** Returns global level number of the first level in the given age (e.g., age 2 → 10). */
export function getFirstLevel(age: number): number {
  return (age - 1) * LEVELS_PER_AGE + 1;
}

export function getAgeForLevel(level: number): number {
  return Math.ceil(level / LEVELS_PER_AGE);
}

export { ALL_LEVELS };
