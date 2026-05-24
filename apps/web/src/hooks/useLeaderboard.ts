'use client';

import { useEffect, useState } from 'react';

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '') + '/api/v1';

export type LeaderboardCategory = 'power' | 'pvp' | 'guild' | 'weekly';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  race: 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';
  score: number;
  allianceTag: string;
}

export interface LeaderboardResponse {
  category: LeaderboardCategory;
  total: number;
  entries: LeaderboardEntry[];
}

/* Public leaderboard list — no JWT required for the stub seed. */
export function useLeaderboard(category: LeaderboardCategory = 'power', limit = 20) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/leaderboard?category=${category}&limit=${limit}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as LeaderboardResponse;
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
  }, [category, limit]);

  return { data, loading, error };
}
