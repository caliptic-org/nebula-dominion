'use client';

import { useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

/* Base-screen live state.
 *
 * Aggregates the pieces the /base HUD + TierBanner needs into a single hook:
 *   - tier progress (current level, age, xp, xp-to-next, tier-name)
 *   - user profile (username + race; race resolution lives in raceApi)
 *
 * Resources (cred/bio/etc.) and the building list are intentionally not here:
 *   - Resources need a gameId scope (`GET /resources?gameId=…`) which the base
 *     screen does not yet track. Falls back to mock.
 *   - Buildings live on the game-server and require its own JWT pipeline.
 *
 * For unauthenticated visitors the hook short-circuits to `{ data: null }` so
 * the page can render its race-derived mock placeholders without flicker.
 */

export interface TierProgressDto {
  userId: string;
  currentLevel: number;
  currentAge: number;
  currentTierName: string;
  raceSpecificTierName: string | null;
  xp: string;
  xpToNextLevel: string;
  isMaxLevel: boolean;
  achievements: Record<string, unknown> | null;
}

export interface BaseStateData {
  tier: TierProgressDto | null;
  /** Convenience: parsed xp percent for the TierBanner progress bar. */
  xpPercent: number;
}

interface UseBaseStateResult {
  data: BaseStateData | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
}

function safeParseXpPercent(xp: string, xpToNext: string): number {
  const a = Number(xp);
  const b = Number(xpToNext);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((a / b) * 100)));
}

export function useBaseState(): UseBaseStateResult {
  const [data, setData] = useState<BaseStateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!hasSession()) {
      setLoading(false);
      setAuthenticated(false);
      return;
    }
    setAuthenticated(true);
    let cancelled = false;
    api
      .get<TierProgressDto>('/tier/progress')
      .then((tier) => {
        if (cancelled) return;
        setData({
          tier,
          xpPercent: safeParseXpPercent(tier.xp, tier.xpToNextLevel),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof FetchError && err.status === 401) {
          setAuthenticated(false);
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error, authenticated };
}
