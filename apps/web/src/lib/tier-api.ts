/* Tier progression API client (54-level model).
 *
 * Mirrors apps/api/src/modules/tier/* contract. The backend serializes
 * bigint XP values as strings, so we keep them as strings on the wire and
 * expose a numeric helper for UI consumption when the value fits in a
 * safe number range.
 */

import { api } from './api';

export interface TierLevel {
  level: number;
  age: number;
  name: string;
  description: string;
  durationLabel: string;
}

export interface TierProgressView {
  userId: string;
  currentLevel: number;
  currentAge: number;
  currentTierName: string;
  /** Race-specific name for the final tier (level 54). `null` otherwise. */
  raceSpecificTierName: string | null;
  /** Accumulated XP as a decimal string (bigint-safe). */
  xp: string;
  /** XP needed for the next level transition as a decimal string. */
  xpToNextLevel: string;
  isMaxLevel: boolean;
  achievements: Record<string, unknown> | null;
}

export interface TierRequirementsView {
  currentLevel: number;
  nextLevel: number | null;
  isMaxLevel: boolean;
  required: { xp: string } | null;
  nextTier: TierLevel | null;
}

export const tierApi = {
  getProgress: () => api.get<TierProgressView>('/tier/progress'),
  getRequirements: () => api.get<TierRequirementsView>('/tier/requirements'),
  listLevels: () => api.get<TierLevel[]>('/tier/levels'),
  levelUp: () => api.post<TierProgressView>('/tier/level-up'),
};

/** Best-effort numeric coercion for XP strings; large values clamp to MAX_SAFE_INTEGER. */
export function xpToNumber(xp: string | null | undefined): number {
  if (!xp) return 0;
  const n = Number(xp);
  if (!Number.isFinite(n)) return Number.MAX_SAFE_INTEGER;
  return n;
}

/** Compute XP progress percent toward the next level. Clamps to [0, 100]. */
export function xpProgressPercent(progress: TierProgressView): number {
  const cur = xpToNumber(progress.xp);
  const need = xpToNumber(progress.xpToNextLevel);
  if (need <= 0) return progress.isMaxLevel ? 100 : 0;
  return Math.max(0, Math.min(100, (cur / need) * 100));
}
