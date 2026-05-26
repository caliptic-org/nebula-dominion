'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '') + '/api/v1';

export interface Quest {
  id: string;
  kind: 'pve' | 'pvp' | 'build' | 'merge' | 'donate' | 'login';
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: { gold?: number; gems?: number; xp?: number };
  claimed: boolean;
}

export interface MissionsResponse {
  playerId: string;
  day: string;
  quests: Quest[];
  bonusUnlockedAt: number;
  totalDone: number;
}

export type MissionType = 'story' | 'weekly' | 'achievement' | 'daily';

export interface PersistedClaim {
  missionId: string;
  missionType: MissionType;
  claimedAt: string;
  reward: { gold?: number; gems?: number; xp?: number };
}

interface ClaimsResponse {
  userId: string;
  claims: PersistedClaim[];
}

/* Daily quests for a player. Falls back to a deterministic stub-seeded set
 * when the canonical DailyEngagementModule is not yet mounted. */
export function useMissions(playerId: string | null) {
  const [data, setData] = useState<MissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/daily/quests/${playerId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as MissionsResponse;
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  return { data, loading, error };
}

/* Persisted claim set for the authenticated user — story / weekly /
 * achievement / daily, anything that's ever been `POST /daily-engagement/claim`'d.
 *
 * Returned as a Set<string> of missionIds plus a `refresh()` so the missions
 * page can re-hydrate after a successful claim without waiting on a poll.
 * Guests get an empty set with no fetch attempt. */
export function useMissionClaims() {
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hasSession()) {
      setClaimed(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<ClaimsResponse>('/daily-engagement/claims');
      setClaimed(new Set(res.claims.map((c) => c.missionId)));
      setError(null);
    } catch (err) {
      // 401 → guest. 404 → backend not mounted yet (older deploy). Either
      // way we keep the empty set so the UI just falls back to its local
      // mock state instead of erroring out.
      if (err instanceof FetchError && (err.status === 401 || err.status === 404)) {
        setClaimed(new Set());
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Optimistic local insert so the UI flips to "claimed" immediately
   *  after a POST resolves, without waiting for the round-trip refresh. */
  const markClaimedLocally = useCallback((missionId: string) => {
    setClaimed((prev) => {
      if (prev.has(missionId)) return prev;
      const next = new Set(prev);
      next.add(missionId);
      return next;
    });
  }, []);

  return { claimed, loading, error, refresh, markClaimedLocally };
}
