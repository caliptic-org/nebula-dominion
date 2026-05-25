'use client';

import { useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

/* Player's recent battles from `GET /battles/history` (JWT only).
 *
 * The profile screen uses this to derive wins / losses / battles /
 * bestStreak instead of hardcoding zeros. Outcome strings come from
 * the meta stub as `'won' | 'lost' | 'in-progress' | 'pending'` — only
 * 'won' / 'lost' contribute to the W/L tally.
 *
 * One-shot by default (no poll) — battle history changes only after the
 * player completes a battle, and the profile screen is short-lived enough
 * that a fresh fetch on mount is sufficient. */

export type BattleOutcome = 'won' | 'lost' | 'in-progress' | 'pending';

export interface BattleHistoryEntry {
  id: string;
  outcome: BattleOutcome;
  opponent: string;
  score: number;
  mvp: string | null;
  when: string;
}

export interface BattleHistoryResponse {
  total: number;
  entries: BattleHistoryEntry[];
}

interface UseBattleHistoryResult {
  data: BattleHistoryResponse | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
}

export function useBattleHistory(): UseBattleHistoryResult {
  const [data, setData] = useState<BattleHistoryResponse | null>(null);
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
      .get<BattleHistoryResponse>('/battles/history')
      .then((json) => {
        if (!cancelled) {
          setData({
            total: json.total ?? 0,
            entries: Array.isArray(json.entries) ? json.entries : [],
          });
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

/* Aggregate raw entries into the W/L summary the profile cards render.
 * Tolerates 'in-progress' / 'pending' rows by ignoring them; bestStreak
 * walks entries in *array order* and tracks the longest consecutive run
 * of `outcome === 'won'`. Battle-history is returned most-recent-first by
 * the backend so this approximates "current win streak" too. */
export function deriveBattleStats(entries: BattleHistoryEntry[]): {
  battles: number;
  wins: number;
  losses: number;
  bestStreak: number;
} {
  let wins = 0;
  let losses = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  for (const e of entries) {
    if (e.outcome === 'won') {
      wins += 1;
      currentStreak += 1;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else if (e.outcome === 'lost') {
      losses += 1;
      currentStreak = 0;
    }
    // in-progress / pending → do not affect streak or W/L counts
  }
  return { battles: wins + losses, wins, losses, bestStreak };
}
