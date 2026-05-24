'use client';

import { useTierProgress } from './useTierProgress';
import { useGameResources } from './useGameResources';

const HUD_PLACEHOLDER = '—';

export interface HudState {
  level: number;
  levelName: string;
  age: number;
  xpPercent: number;
  resA: string;
  resB: string;
  crystal: string;
  loading: boolean;
}

function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) {
    return HUD_PLACEHOLDER;
  }
  return Math.floor(amount).toLocaleString('tr-TR');
}

/**
 * Surfaces the live game state required by the HUD / TierBanner.
 *
 * Level + tier name come from api's /tier/progress (54-level model).
 *
 * Resource amounts (resA / resB / crystal) come from game-server's
 * /api/buildings/resources — that's where the live wallet lives. The
 * earlier implementation went through api's /games + /resources, which
 * returned empty for accounts that hadn't joined a match (the common
 * case during normal play), so the HUD rendered placeholders even
 * though the player had real mineral/gas/energy.
 *
 * Mapping: mineral → resA, gas → resB, energy → crystal. Each race's
 * lex defines what those slots are labelled as on screen (e.g. zerg
 * reads them as "Biyokütle / Genetik / Gen").
 *
 * Both data sources gracefully degrade to placeholders so screens
 * never render the legacy "Level 9 / Metropol / 12,480 / 3,210 / 42"
 * mock values.
 */
export function useHudState(): HudState {
  const { progress, xpPercent, loading: tierLoading } = useTierProgress();
  const { data: resources, loading: resourcesLoading } = useGameResources();

  return {
    level: progress?.currentLevel ?? 1,
    levelName: progress?.currentTierName ?? HUD_PLACEHOLDER,
    age: progress?.currentAge ?? 1,
    xpPercent,
    resA: formatAmount(resources?.mineral),
    resB: formatAmount(resources?.gas),
    crystal: formatAmount(resources?.energy),
    loading: tierLoading || resourcesLoading,
  };
}
