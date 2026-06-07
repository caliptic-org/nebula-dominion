import { Race, RACE_TIER9_NAMES } from '../../user/entities/race.enum';

export interface TierLevelDef {
  level: number;
  age: number;
  name: string;
  description: string;
  durationLabel: string;
}

export const TIER_LEVELS: TierLevelDef[] = [
  // Çağ 1: Gezegensel Uyanış (1-9)
  { level: 1, age: 1, name: 'Tohum', description: 'İlk uyanış, başlangıç', durationLabel: 'Anlık' },
  { level: 2, age: 1, name: 'Filiz', description: 'Temel kaynak toplama', durationLabel: '6-12 saat' },
  { level: 3, age: 1, name: 'Çekirdek', description: 'İlk birim üretimi', durationLabel: '12-24 saat' },
  { level: 4, age: 1, name: 'Yuva', description: 'Savunma kuruluşu', durationLabel: '1 gün' },
  { level: 5, age: 1, name: 'Yerleşim', description: 'Üs genişleme', durationLabel: '1-2 gün' },
  { level: 6, age: 1, name: 'Köy', description: 'Çoklu yapı yönetimi', durationLabel: '1-2 gün' },
  { level: 7, age: 1, name: 'Kasaba', description: 'Birleştirme/mutasyon başlar', durationLabel: '2 gün' },
  { level: 8, age: 1, name: 'Şehir', description: 'Komutan tanıtımı', durationLabel: '2 gün' },
  { level: 9, age: 1, name: 'Metropol', description: 'Çağ 1 zirvesi, geçiş hikaye seti', durationLabel: '2 gün' },
  // Çağ 2: Yıldız Sistemi Hakimiyeti (10-18)
  { level: 10, age: 2, name: 'Yörünge', description: 'Uzaya çıkış', durationLabel: '1 gün' },
  { level: 11, age: 2, name: 'Uydu', description: 'İlk yörünge yapısı', durationLabel: '1-2 gün' },
  { level: 12, age: 2, name: 'İkiz Gezegen', description: 'İkinci gezegen kolonisi', durationLabel: '2 gün' },
  { level: 13, age: 2, name: 'Üçlü Sistem', description: 'Üç gezegen kontrol', durationLabel: '2 gün' },
  { level: 14, age: 2, name: 'İç Sistem', description: 'Yıldıza yakın bölge', durationLabel: '2 gün' },
  { level: 15, age: 2, name: 'Dış Sistem', description: 'Uzak gezegenler', durationLabel: '2 gün' },
  { level: 16, age: 2, name: 'Asteroid Kuşağı', description: 'Madencilik üssü', durationLabel: '2 gün' },
  { level: 17, age: 2, name: 'Sistem Komutanı', description: 'Tüm sistem fethedildi', durationLabel: '2-3 gün' },
  { level: 18, age: 2, name: 'Yıldız Hakimi', description: 'Çağ 2 zirvesi, geçiş hikaye seti', durationLabel: '2-3 gün' },
  // Çağ 3: Sektör Genişlemesi (19-27)
  { level: 19, age: 3, name: 'Keşifçi', description: 'İlk yıldız sistemleri arası gemi', durationLabel: '2 gün' },
  { level: 20, age: 3, name: 'Öncü', description: 'İkinci sistem keşfi', durationLabel: '2 gün' },
  { level: 21, age: 3, name: 'Kolonist', description: 'İkinci sistem kolonileştirme', durationLabel: '2-3 gün' },
  { level: 22, age: 3, name: 'Sektör Beyi', description: 'Üç sistem kontrol', durationLabel: '2-3 gün' },
  { level: 23, age: 3, name: 'Çoklu Sistem', description: 'Beş sistem hakimiyeti', durationLabel: '3 gün' },
  { level: 24, age: 3, name: 'Bölge Lordu', description: 'Mini sektör kontrol', durationLabel: '3 gün' },
  { level: 25, age: 3, name: 'Sektör Lordu', description: 'Tam bir sektörü kontrol', durationLabel: '3 gün' },
  { level: 26, age: 3, name: 'Yıldız Generali', description: 'Askeri zafer büyük PvP', durationLabel: '3 gün' },
  { level: 27, age: 3, name: 'Sektör Hakimi', description: 'Çağ 3 zirvesi, geçiş hikaye seti', durationLabel: '3-4 gün' },
  // Çağ 4: Galaktik Çatışma (28-36)
  { level: 28, age: 4, name: 'Galaktik Şövalye', description: 'Galaktik arenaya giriş', durationLabel: '3 gün' },
  { level: 29, age: 4, name: 'Yıldız Mareşali', description: 'Galaktik filo komutanı', durationLabel: '3 gün' },
  { level: 30, age: 4, name: 'Spiral Kolu Lordu', description: 'Galaksi kolu kontrol', durationLabel: '3-4 gün' },
  { level: 31, age: 4, name: 'Galaktik Komutan', description: 'Çoklu sektör askeri', durationLabel: '4 gün' },
  { level: 32, age: 4, name: 'Çekirdek Hakimi', description: 'Galaksi merkezi', durationLabel: '4 gün' },
  { level: 33, age: 4, name: 'Halo Lordu', description: 'Galaksi kenarı', durationLabel: '4 gün' },
  { level: 34, age: 4, name: 'Galaksi Generali', description: 'Galaksi savaşı zaferi', durationLabel: '4-5 gün' },
  { level: 35, age: 4, name: 'Galaksi Mareşali', description: 'Galaksi-çapı kontrol', durationLabel: '4-5 gün' },
  { level: 36, age: 4, name: 'Galaktik İmparator', description: 'Çağ 4 zirvesi, geçiş hikaye seti', durationLabel: '5 gün' },
  // Çağ 5: Boyutlar Arası Keşif (37-45)
  { level: 37, age: 5, name: 'Boyut Kâşifi', description: 'İlk subspace yarığı', durationLabel: '4 gün' },
  { level: 38, age: 5, name: 'Subspace Yolcusu', description: 'Boyutlar arası seyahat', durationLabel: '4 gün' },
  { level: 39, age: 5, name: 'Paralel Lord', description: 'İkinci evren keşfi', durationLabel: '4-5 gün' },
  { level: 40, age: 5, name: 'Çoklu-Evren Komutanı', description: 'Üç evren kontrol', durationLabel: '5 gün' },
  { level: 41, age: 5, name: 'Boyut Mareşali', description: 'Boyutlar arası filo', durationLabel: '5 gün' },
  { level: 42, age: 5, name: 'Yarık Hakimi', description: 'Subspace yarık ustası', durationLabel: '5 gün' },
  { level: 43, age: 5, name: 'Boyutlar Arası Lord', description: 'Beş evren kontrol', durationLabel: '5 gün' },
  { level: 44, age: 5, name: 'Çok-Boyutlu Hakim', description: 'Boyutlar arası savaş zaferi', durationLabel: '5-6 gün' },
  { level: 45, age: 5, name: 'Boyut Tanrısı', description: 'Çağ 5 zirvesi, geçiş hikaye seti', durationLabel: '6 gün' },
  // Çağ 6: Kozmik Üstünlük (46-54)
  { level: 46, age: 6, name: 'Evren Kâşifi', description: 'Kozmik bilinç uyanışı', durationLabel: '5 gün' },
  { level: 47, age: 6, name: 'Kozmik Şövalye', description: 'Kozmik savaş arenası', durationLabel: '5 gün' },
  { level: 48, age: 6, name: 'Kozmik Lord', description: 'Çoklu galaksi kontrol', durationLabel: '5 gün' },
  { level: 49, age: 6, name: 'Universe Master', description: 'Donghua referansı, tam evren ustası', durationLabel: '5-6 gün' },
  { level: 50, age: 6, name: 'Kozmik İmparator', description: 'Tüm evren komutası', durationLabel: '6 gün' },
  { level: 51, age: 6, name: 'Çok-Evrenli Hakim', description: 'Tüm paralel evrenler', durationLabel: '6 gün' },
  { level: 52, age: 6, name: 'Sonsuz Hakim', description: 'Sonsuzluk konsepti', durationLabel: '6 gün' },
  { level: 53, age: 6, name: 'Kozmik Konsey Üyesi', description: 'Sezon sonu olayı', durationLabel: '6-7 gün' },
  { level: 54, age: 6, name: 'Tier 9 Hakimi', description: 'Irk-spesifik mutlak güç (final)', durationLabel: 'Sürekli' },
];

export const TIER_LEVELS_BY_LEVEL: Record<number, TierLevelDef> = TIER_LEVELS.reduce(
  (acc, def) => {
    acc[def.level] = def;
    return acc;
  },
  {} as Record<number, TierLevelDef>,
);

export const MAX_TIER_LEVEL = 54;
export const MIN_TIER_LEVEL = 1;

export function resolveTierName(level: number, race: Race | null): string {
  const clamped = Math.max(MIN_TIER_LEVEL, Math.min(MAX_TIER_LEVEL, level));
  const def = TIER_LEVELS_BY_LEVEL[clamped];
  if (clamped === MAX_TIER_LEVEL && race) {
    return RACE_TIER9_NAMES[race];
  }
  return def?.name ?? `Seviye ${clamped}`;
}

export function resolveAge(level: number): number {
  const clamped = Math.max(MIN_TIER_LEVEL, Math.min(MAX_TIER_LEVEL, level));
  return TIER_LEVELS_BY_LEVEL[clamped]?.age ?? 1;
}

/**
 * cycle 17 BAL-3 — SINGLE XP CURVE, game-server canonical, api MIRRORS not invents.
 *
 * This table is a verbatim copy of game-server's per-level `xpToNext` deltas
 * (apps/game-server/src/progression/config/level-config.ts). game-server is the
 * sole XP source of truth (cycle 2 A9). The api tier view must NOT invent its
 * own curve — the previous `xpRequiredForLevel(L) = 100·L²` formula disagreed
 * with this table at EVERY level (Lv2: 400 vs 359; Lv30: 90000 vs 8449) and made
 * the HUD XP-to-next bar never line up with real level-ups.
 *
 * SEMANTICS — keyed by CURRENT level (NOT next level), matching game-server's
 * `toDto()`:  xpToNextLevel = getLevelDef(currentLevel).xpToNext.
 *   - The value is the XP delta needed to advance FROM `level` to `level + 1`.
 *   - `null` on game-server means "last level of its age" (advance-age gated) or
 *     max level; here we surface it as 0 (no in-age level-up remaining), which
 *     the FE renders as a full / capped bar.
 *
 * If this table and game-server's level-config.ts ever drift, game-server wins —
 * fix this copy, never re-introduce a formula. Ideally both apps would import a
 * shared package; until that refactor lands this mirror keeps them in lockstep.
 */
export const XP_TO_NEXT_BY_LEVEL: Record<number, number | null> = {
  1: 359, 2: 423, 3: 500, 4: 590, 5: 696, 6: 821, 7: 969, 8: 1143, 9: null,
  10: 816, 11: 962, 12: 1136, 13: 1340, 14: 1581, 15: 1866, 16: 2202, 17: 2597, 18: null,
  19: 2219, 20: 2618, 21: 3088, 22: 3645, 23: 4302, 24: 5076, 25: 5990, 26: 7067, 27: null,
  28: 6068, 29: 7160, 30: 8449, 31: 9970, 32: 11764, 33: 13881, 34: 16380, 35: 19328, 36: null,
  37: 15334, 38: 18094, 39: 21351, 40: 25194, 41: 29729, 42: 35079, 43: 41396, 44: 48847, 45: null,
  46: 37189, 47: 43883, 48: 51779, 49: 61083, 50: 72097, 51: 85074, 52: 100387, 53: 118487, 54: null,
};

/**
 * cycle 17 BAL-3 — XP needed to advance FROM `currentLevel` to `currentLevel + 1`,
 * mirroring game-server's canonical per-level curve. Replaces the old
 * `xpRequiredForLevel(L) = 100·L²` formula.
 *
 * Returns 0n when the level is the last of its age (game-server `xpToNext: null`,
 * advance-age gated) or at/above max level — the FE shows a full/capped bar.
 *
 * @param currentLevel the player's CURRENT level (not the next level)
 */
export function xpToNextForLevel(currentLevel: number): bigint {
  const clamped = Math.max(MIN_TIER_LEVEL, Math.min(MAX_TIER_LEVEL, currentLevel));
  const xpToNext = XP_TO_NEXT_BY_LEVEL[clamped];
  return xpToNext == null ? 0n : BigInt(xpToNext);
}
