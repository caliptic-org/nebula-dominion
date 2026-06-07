/**
 * Commander catalog + bonus engine.
 *
 * The catalog (20 commanders: 5 races × 4 tiers) mirrors the static lex on
 * the FE. The bonus engine maps `commander_id` → typed `CommanderBonus`
 * effects that other services consume:
 *
 *   - combat:  damageMultiplier, defenseMultiplier, hpMultiplier
 *   - economy: resourceProductionMultiplier (mineral + gas + energy ticks)
 *   - production: trainSpeedMultiplier (units), buildSpeedMultiplier (buildings)
 *   - research: scienceMultiplier (science gain rate)
 *   - cost:    trainCostMultiplier, buildCostMultiplier (NEGATIVE = discount)
 *
 * Effects scale linearly with level: a +12% base bonus at L1 amplifies
 * to +12% × (1 + 0.05 × (level - 1)). So at L10, +12% becomes +17.4%.
 * This is the "skill effect" mechanic the user opted into (Seviye 3,
 * Full bonus orientation).
 *
 * Two helpers exported:
 *   - getCommanderCatalog() → full 20-row roster (race-filtered or all)
 *   - getCommanderBonus(commanderId, level) → typed effects at given level
 */

export type CommanderRace = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';
export type CommanderTier = 'BAŞ KOMUTAN' | 'TIER 2' | 'TIER 3' | 'TIER 4' | 'TIER 5';

export interface CommanderCatalogEntry {
  id: string;
  name: string;
  title: string;
  race: CommanderRace;
  tier: CommanderTier;
  /** Display string for the FE — kept Turkish for parity with the previous
   *  stub. The engine reads BONUS_TABLE keyed by `id` for actual effects. */
  skill: string;
  /** Whether this commander is part of the starter roster (always unlocked
   *  for a player of this race) or locked behind a quest/age gate. */
  startsUnlocked: boolean;
  portrait: string;
}

/** Typed bonus shape — all values are MULTIPLIERS to add (so 0.12 = +12%,
 *  -0.18 = -18% / 18% faster / 18% cheaper). Zero = no effect. */
export interface CommanderBonus {
  damageMultiplier?: number;
  defenseMultiplier?: number;
  hpMultiplier?: number;
  resourceProductionMultiplier?: number;
  trainSpeedMultiplier?: number;   // -% (faster). Apply as duration × (1 + this), so negative = faster.
  buildSpeedMultiplier?: number;   // same convention
  scienceMultiplier?: number;
  trainCostMultiplier?: number;    // negative = discount
  buildCostMultiplier?: number;    // negative = discount
}

/** Base bonus at level 1. Level scaling applied at lookup time. */
const BASE_BONUSES: Record<string, CommanderBonus> = {
  // ─── İnsan ──────────────────────────────────────────────────────────
  voss:     { damageMultiplier: 0.12 },                         // "Tüm filo +12% hasar"
  chen:     { scienceMultiplier: 0.22 },                        // "Bilim +22%"
  reyes:    { trainSpeedMultiplier: -0.18 },                    // "Eğitim hızı +18%" → -18% duration
  kovacs:   { damageMultiplier: 0.15, defenseMultiplier: -0.10 }, // "İstihbarat" (locked T4 — placeholder)

  // ─── Zerg ───────────────────────────────────────────────────────────
  vex:      { damageMultiplier: 0.14 },                         // "Tüm sürü +14% saldırı"
  threnix:  { trainSpeedMultiplier: -0.28 },                    // "Mutasyon hızı +28%"
  morgath:  { damageMultiplier: 0.20 },                         // "AI saldırı puanı +20%"
  kthala:   { resourceProductionMultiplier: 0.25 },             // "Üretim Lordu" (locked T5)

  // ─── Otomat ─────────────────────────────────────────────────────────
  prime:    { resourceProductionMultiplier: 0.10 },             // "Tüm üretim +10%"
  aurelius: { buildSpeedMultiplier: -0.22 },                    // "İnşaa süresi -22%"
  crucible: { damageMultiplier: 0.16 },                         // "Birim hasarı +16%"
  lokhode:  { scienceMultiplier: 0.30, buildCostMultiplier: -0.10 }, // T4 lock

  // ─── Canavar ────────────────────────────────────────────────────────
  khorvash: { damageMultiplier: 0.18 },                         // "Yakın dövüş +18%"
  ulrek:    { resourceProductionMultiplier: 0.24 },             // "Kan Özü +24%"
  ravenna:  { trainSpeedMultiplier: -0.30 },                    // "Av süresi -30%"
  korova:   { damageMultiplier: 0.25, hpMultiplier: 0.20 },     // T5 lock

  // ─── Şeytan ─────────────────────────────────────────────────────────
  malphas:  { buildCostMultiplier: -0.15 },                     // "Pakt maliyeti -15%"
  lilithra: { trainSpeedMultiplier: -0.25 },                    // "Çağırma süresi -25%"
  vorhaal:  { damageMultiplier: 0.20, defenseMultiplier: -0.08 }, // "Komutan suikast"
  azurath:  { trainCostMultiplier: -0.20, buildCostMultiplier: -0.10 }, // T4 lock
};

export const COMMANDER_CATALOG: CommanderCatalogEntry[] = [
  // ── İnsan ──
  { id: 'voss',   name: 'Kmt. Aleksander Voss',  title: 'Genetik Savaşçı', race: 'insan', tier: 'BAŞ KOMUTAN', skill: 'Tüm filo +12% hasar',         startsUnlocked: true,  portrait: '/assets/characters/insan/voss.png' },
  { id: 'chen',   name: 'Dr. Elara Chen',         title: 'Baş Bilim Adamı', race: 'insan', tier: 'TIER 2',      skill: 'Bilim +22%',                  startsUnlocked: true,  portrait: '/assets/characters/insan/chen.png' },
  { id: 'reyes',  name: 'General Marcus Reyes',   title: 'Askeri Komutan',  race: 'insan', tier: 'TIER 3',      skill: 'Eğitim hızı +18%',            startsUnlocked: true,  portrait: '/assets/characters/insan/reyes.png' },
  { id: 'kovacs', name: "Lily 'Phantom' Kovacs",  title: 'İstihbarat',      race: 'insan', tier: 'TIER 4',      skill: '+15% hasar, suikast +%',      startsUnlocked: false, portrait: '/assets/characters/insan/kovacs.png' },
  // ── Zerg ──
  { id: 'vex',     name: "Ana Kraliçe Vex'thara", title: 'Kovan Bilinci',   race: 'zerg',  tier: 'BAŞ KOMUTAN', skill: 'Tüm sürü +14% saldırı',       startsUnlocked: true,  portrait: '/assets/characters/zerg/vex_thara.png' },
  { id: 'threnix', name: 'Genom Üstadı Threnix',  title: 'Evrim Mühendisi', race: 'zerg',  tier: 'TIER 3',      skill: 'Mutasyon hızı +28%',          startsUnlocked: true,  portrait: '/assets/characters/zerg/threnix.png' },
  { id: 'morgath', name: "Beyin Kurt Mor'gath",   title: 'Strateji',        race: 'zerg',  tier: 'TIER 4',      skill: 'AI saldırı puanı +20%',       startsUnlocked: false, portrait: '/assets/characters/zerg/morgath.png' },
  { id: 'kthala',  name: 'Brood-Anne Kthala',     title: 'Üretim Lordu',    race: 'zerg',  tier: 'TIER 5',      skill: 'Kaynak üretimi +25%',         startsUnlocked: false, portrait: '/assets/characters/zerg/kthala.png' },
  // ── Otomat ──
  { id: 'prime',    name: 'Demiurge Prime',         title: 'Merkez YZ',      race: 'otomat', tier: 'BAŞ KOMUTAN', skill: 'Tüm üretim +10%',            startsUnlocked: true,  portrait: '/assets/characters/otomat/demiurge_prime.png' },
  { id: 'aurelius', name: 'Mimar Aurelius',         title: 'Yapı Lordu',     race: 'otomat', tier: 'TIER 2',      skill: 'İnşaa süresi -22%',          startsUnlocked: true,  portrait: '/assets/characters/otomat/aurelius.png' },
  { id: 'crucible', name: 'Alg. Şövalye Crucible',  title: 'Savaş Komutanı', race: 'otomat', tier: 'TIER 3',      skill: 'Birim hasarı +16%',          startsUnlocked: true,  portrait: '/assets/characters/otomat/crucible.png' },
  { id: 'lokhode',  name: 'Lo-Khode Veri-Mühendis', title: 'Sistem Yönetici', race: 'otomat', tier: 'TIER 4',     skill: '+30% bilim, -10% maliyet',   startsUnlocked: false, portrait: '/assets/characters/otomat/lo_khode.png' },
  // ── Canavar ──
  { id: 'khorvash', name: 'Alpha Khorvash',          title: 'Sürü Lideri',   race: 'canavar', tier: 'BAŞ KOMUTAN', skill: 'Yakın dövüş +18%',          startsUnlocked: true,  portrait: '/assets/characters/canavar/khorvash.png' },
  { id: 'ulrek',    name: 'Şaman Ulrek',             title: 'Ata Çağrıcı',   race: 'canavar', tier: 'TIER 2',      skill: 'Kan Özü +24%',              startsUnlocked: true,  portrait: '/assets/characters/canavar/ulrek.png' },
  { id: 'ravenna',  name: 'Avcı Kraliçe Ravenna',    title: 'Av Lordu',      race: 'canavar', tier: 'TIER 3',      skill: 'Av süresi -30%',            startsUnlocked: true,  portrait: '/assets/characters/canavar/ravenna.png' },
  { id: 'korova',   name: 'Korova, Beast-God Yavru', title: 'Primordial',    race: 'canavar', tier: 'TIER 5',      skill: '+25% hasar, +20% HP',       startsUnlocked: false, portrait: '/assets/characters/canavar/korova.png' },
  // ── Şeytan ──
  { id: 'malphas',  name: 'Karanlık Lord Malphas',   title: 'Sürgün Lord',   race: 'seytan',  tier: 'BAŞ KOMUTAN', skill: 'Pakt maliyeti -15%',        startsUnlocked: true,  portrait: '/assets/characters/seytan/malphas.png' },
  { id: 'lilithra', name: 'Cadı-Kraliçe Lilithra',   title: 'Ritüel Ustası', race: 'seytan',  tier: 'TIER 2',      skill: 'Çağırma süresi -25%',       startsUnlocked: true,  portrait: '/assets/characters/seytan/lilithra.png' },
  { id: 'vorhaal',  name: 'Suikastçı Vorhaal',       title: 'Gölge Bıçak',   race: 'seytan',  tier: 'TIER 3',      skill: 'Suikast hasarı +20%',       startsUnlocked: true,  portrait: '/assets/characters/seytan/vorhaal.png' },
  { id: 'azurath',  name: 'Borç Tahsilcisi Azurath', title: 'Borç Lordu',    race: 'seytan',  tier: 'TIER 4',      skill: 'Maliyet -%20 / -%10',       startsUnlocked: false, portrait: '/assets/characters/seytan/azurath.png' },
];

const CATALOG_BY_ID = new Map<string, CommanderCatalogEntry>(
  COMMANDER_CATALOG.map((c) => [c.id, c]),
);

/** Look up a single commander by id (across all races). */
export function getCommanderById(id: string): CommanderCatalogEntry | undefined {
  return CATALOG_BY_ID.get(id);
}

/** Filtered catalog — by race or all. */
export function getCommandersByRace(race: CommanderRace | null): CommanderCatalogEntry[] {
  if (!race) return [...COMMANDER_CATALOG];
  return COMMANDER_CATALOG.filter((c) => c.race === race);
}

/** ── Level scaling ──────────────────────────────────────────────────────
 *  XP required to advance from level N to N+1. Geometric: 100 × 1.18^(N-1).
 *  L1→L2: 100, L2→L3: 118, L3→L4: 139, ..., L9→L10: ~376, L19→L20: ~1967,
 *  L29→L30: ~10.3k.
 *
 *  ## cycle 17 — BAL-3 curve flatten (1.4 → 1.18)
 *
 *  The old base of 1.4 produced a grotesque grind: cumulative L1→L30 was
 *  ~4.32M XP. At the real PvP payout of +100 XP/win that is ~43,000 wins
 *  to max a single commander — the prior JSDoc's "~150 battles" claim was
 *  wrong by ~280×. Flattening the base to 1.18 brings the curve in line
 *  with the intended grind:
 *
 *    - Cumulative L1→L10: ~1,909 XP  ≈   19 wins  (+100/win)
 *    - Cumulative L1→L20: ~12,342 XP ≈  123 wins  (matches the intended
 *                                                  ~150-with-bonus target)
 *    - Cumulative L1→L30: ~66,945 XP ≈  669 wins  (full max is a long-tail
 *                                                  prestige chase, not the
 *                                                  baseline progression)
 *
 *  These are the REAL numbers (computed from the formula below), not an
 *  aspirational estimate — keep this block in sync if the base changes. */
export const COMMANDER_MAX_LEVEL = 30;
export function xpForNextLevel(level: number): number {
  if (level >= COMMANDER_MAX_LEVEL) return 0;
  return Math.round(100 * Math.pow(1.18, level - 1));
}

/** Level scaling factor applied to base bonus.
 *  Level 1 → 1.0× (raw bonus). Each level adds +5% amplification.
 *  Level 10 → 1.45× (a 12% bonus becomes 17.4%).
 *  Level 30 → 2.45× (a 12% bonus becomes 29.4%). */
export function levelScale(level: number): number {
  const clamped = Math.max(1, Math.min(COMMANDER_MAX_LEVEL, level));
  return 1 + (clamped - 1) * 0.05;
}

/** Returns the level-scaled CommanderBonus for an (id, level) pair.
 *  Returns an empty bonus object for unknown ids. */
export function getCommanderBonus(commanderId: string, level: number): CommanderBonus {
  const base = BASE_BONUSES[commanderId];
  if (!base) return {};
  const scale = levelScale(level);
  const out: CommanderBonus = {};
  for (const key of Object.keys(base) as Array<keyof CommanderBonus>) {
    const v = base[key];
    if (v === undefined) continue;
    out[key] = +(v * scale).toFixed(4);
  }
  return out;
}

/** Empty / neutral bonus — used when no commander is active. */
export const NO_BONUS: CommanderBonus = {};
