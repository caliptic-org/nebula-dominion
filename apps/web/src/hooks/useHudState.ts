'use client';

import { useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';
import { useTierProgress } from './useTierProgress';

const HUD_PLACEHOLDER = '—';

interface GameSummary {
  id: string;
  name?: string;
  status?: string;
}

interface ResourceRow {
  id: string;
  type: 'metal' | 'crystal' | 'gas' | 'energy' | 'dark_matter';
  amount: number | string;
}

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

function formatAmount(amount: number | string | undefined): string {
  if (amount === undefined || amount === null) return HUD_PLACEHOLDER;
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return HUD_PLACEHOLDER;
  return Math.floor(n).toLocaleString('tr-TR');
}

/**
 * Surfaces the live game state required by the HUD / TierBanner.
 *
 * Level + tier name come from /tier/progress (54-level model).
 * Resource amounts come from /resources?gameId={firstActiveGame}.
 * Both gracefully degrade to placeholders so screens never render the
 * legacy "Level 9 / Metropol / 12,480 / 3,210 / 42" mock values.
 */
export function useHudState(): HudState {
  const { progress, xpPercent, loading: tierLoading } = useTierProgress();
  const [resourcesByType, setResourcesByType] = useState<Record<string, number | string> | null>(
    null,
  );
  const [resourcesLoading, setResourcesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const games = await api.get<GameSummary[]>('/games');
        const game = Array.isArray(games) ? games[0] : null;
        if (!game) {
          if (!cancelled) setResourcesByType({});
          return;
        }
        const rows = await api.get<ResourceRow[]>(
          `/resources?gameId=${encodeURIComponent(game.id)}`,
        );
        const map: Record<string, number | string> = {};
        for (const row of rows ?? []) map[row.type] = row.amount;
        if (!cancelled) setResourcesByType(map);
      } catch (err) {
        if (!(err instanceof FetchError) || err.status !== 401) {
          // Network or unexpected error — keep loading state false but values empty
        }
        if (!cancelled) setResourcesByType({});
      } finally {
        if (!cancelled) setResourcesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const map = resourcesByType ?? {};

  return {
    level: progress?.currentLevel ?? 1,
    levelName: progress?.currentTierName ?? HUD_PLACEHOLDER,
    age: progress?.currentAge ?? 1,
    xpPercent,
    resA: formatAmount(map.metal),
    resB: formatAmount(map.gas),
    crystal: formatAmount(map.crystal),
    loading: tierLoading || resourcesLoading,
  };
}
