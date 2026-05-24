'use client';

import { useEffect, useState } from 'react';

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
