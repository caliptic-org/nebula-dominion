import { GuildResearchBranch } from './entities/guild-research-state.entity';

/**
 * Guild tech-tree research definitions. CAL-240.
 *
 * 3 dal × N araştırma. Her seviye 7 gün ve 100K-500K toplam katkı XP gerektirir.
 * Tamamlanan araştırma lonca-geneli buff sağlar; buff'lar `applyGuildBuffs`
 * tarafından compose edilir.
 *
 * `level` 1-indexed. Aynı araştırmayı bir üst seviyede çalışmak için
 * önceki seviyeyi tamamlamış olmak gerekir (linear unlock).
 */
export interface GuildResearchDefinition {
  id: string;
  branch: GuildResearchBranch;
  /**
   * Multi-level researches: each entry is one level's config.
   * `xpRequired` must be in the [100K, 500K] window — see migration constraint.
   */
  levels: ReadonlyArray<{
    level: number;
    xpRequired: number;
    /**
     * Buff effect applied to the guild on completion.
     */
    effect: GuildBuffEffect;
  }>;
}

export type GuildBuffEffect =
  | { kind: 'production_pct'; value: number }
  | { kind: 'raid_damage_pct'; value: number }
  | { kind: 'member_capacity'; value: number };

/** Default member capacity at guild creation (no expansion researched). */
export const DEFAULT_MEMBER_CAPACITY = 25;

export const RESEARCH_DURATION_DAYS = 7;
export const RESEARCH_WEEKLY_SLOTS = 3;

export const GUILD_RESEARCH_CATALOG: ReadonlyArray<GuildResearchDefinition> = [
  // ─── Üretim dalı ──────────────────────────────────────────────────────────
  {
    id: 'production_boost',
    branch: GuildResearchBranch.PRODUCTION,
    levels: [
      { level: 1, xpRequired: 100_000, effect: { kind: 'production_pct', value: 5 } },
      { level: 2, xpRequired: 200_000, effect: { kind: 'production_pct', value: 10 } },
      { level: 3, xpRequired: 350_000, effect: { kind: 'production_pct', value: 15 } },
    ],
  },
  // ─── Raid dalı ────────────────────────────────────────────────────────────
  {
    id: 'raid_damage',
    branch: GuildResearchBranch.RAID,
    levels: [
      { level: 1, xpRequired: 150_000, effect: { kind: 'raid_damage_pct', value: 10 } },
      { level: 2, xpRequired: 300_000, effect: { kind: 'raid_damage_pct', value: 20 } },
      { level: 3, xpRequired: 500_000, effect: { kind: 'raid_damage_pct', value: 35 } },
    ],
  },
  // ─── Genişleme dalı (üye kapasitesi: 25 → 35 → 50 → 70) ──────────────────
  {
    id: 'member_capacity',
    branch: GuildResearchBranch.EXPANSION,
    levels: [
      { level: 1, xpRequired: 200_000, effect: { kind: 'member_capacity', value: 35 } },
      { level: 2, xpRequired: 350_000, effect: { kind: 'member_capacity', value: 50 } },
      { level: 3, xpRequired: 500_000, effect: { kind: 'member_capacity', value: 70 } },
    ],
  },
];

export function getResearchDefinition(researchId: string): GuildResearchDefinition | null {
  return GUILD_RESEARCH_CATALOG.find((r) => r.id === researchId) ?? null;
}

export function getResearchLevelConfig(
  researchId: string,
  level: number,
): { level: number; xpRequired: number; effect: GuildBuffEffect } | null {
  const def = getResearchDefinition(researchId);
  if (!def) return null;
  return def.levels.find((l) => l.level === level) ?? null;
}

/**
 * Compose a flat buff snapshot from a list of completed research states.
 * - production_pct buffs are summed.
 * - raid_damage_pct buffs are summed.
 * - member_capacity uses the *highest* (latest tier wins, not additive).
 */
export interface GuildBuffsSnapshot {
  productionPct: number;
  raidDamagePct: number;
  memberCapacity: number;
  completedResearchIds: string[];
}

export function composeGuildBuffs(
  completed: ReadonlyArray<{ researchId: string; level: number }>,
): GuildBuffsSnapshot {
  const snapshot: GuildBuffsSnapshot = {
    productionPct: 0,
    raidDamagePct: 0,
    memberCapacity: DEFAULT_MEMBER_CAPACITY,
    completedResearchIds: [],
  };

  for (const c of completed) {
    const cfg = getResearchLevelConfig(c.researchId, c.level);
    if (!cfg) continue;
    snapshot.completedResearchIds.push(`${c.researchId}@${c.level}`);
    switch (cfg.effect.kind) {
      case 'production_pct':
        snapshot.productionPct += cfg.effect.value;
        break;
      case 'raid_damage_pct':
        snapshot.raidDamagePct += cfg.effect.value;
        break;
      case 'member_capacity':
        snapshot.memberCapacity = Math.max(snapshot.memberCapacity, cfg.effect.value);
        break;
    }
  }

  return snapshot;
}
