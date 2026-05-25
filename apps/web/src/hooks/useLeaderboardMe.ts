'use client';

import { useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

/* Server-side leaderboard row for the authenticated player.
 *
 * `GET /leaderboard/me` returns a deterministic per-user score with
 * `rank: null` for now (cross-player ranking lands later). The /leaderboard
 * page uses this to render the "me" row with the *real* score (consistent
 * per user across sessions) instead of synthesising one from profile.xp
 * which floats with XP grind.
 *
 * One-shot — no poll. The leaderboard score is server-derived and stable
 * per account until rank ordering exists. */

export interface LeaderboardMeDto {
  /** null until cross-player ranking lands; UI renders "—" */
  rank: number | null;
  name: string;
  score: number;
}

interface UseLeaderboardMeResult {
  data: LeaderboardMeDto | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
}

export function useLeaderboardMe(): UseLeaderboardMeResult {
  const [data, setData] = useState<LeaderboardMeDto | null>(null);
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
      .get<LeaderboardMeDto>('/leaderboard/me')
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof FetchError && err.status === 401) {
          setAuthenticated(false);
          setData(null);
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
