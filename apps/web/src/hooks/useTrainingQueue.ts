'use client';

import { useEffect, useState } from 'react';
import { getAccessToken, hasSession } from '@/lib/session';

/* Live training-queue for the authed player.
 *
 * Mirrors useGameUnits (game-server JWT pipeline + 30s poll) but for the
 * training_queue table. /base/production consumes this to render the
 * actual in-flight unit production instead of a hardcoded seed list.
 *
 * Empty array when the player has nothing training — that's the correct
 * "I haven't trained anything yet" state, not a loading shimmer. */

const GAME_SERVER_BASE = (
  process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

export interface TrainingQueueDto {
  id: string;
  playerId: string;
  buildingId: string;
  unitType: string;
  race: string;
  completesAt: string;
  isComplete: boolean;
  createdAt: string;
}

interface UseTrainingQueueResult {
  data: TrainingQueueDto[] | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
  refresh: () => void;
}

const POLL_MS = 30_000;

export function useTrainingQueue(): UseTrainingQueueResult {
  const [data, setData] = useState<TrainingQueueDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!hasSession()) {
      setLoading(false);
      setAuthenticated(false);
      return;
    }
    setAuthenticated(true);

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchOnce() {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setAuthenticated(false);
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(`${GAME_SERVER_BASE}/api/units/training-queue`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as TrainingQueueDto[];
        if (!cancelled) {
          setData(Array.isArray(json) ? json : []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(fetchOnce, POLL_MS);
        }
      }
    }

    fetchOnce();
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [tick]);

  return {
    data,
    loading,
    error,
    authenticated,
    refresh: () => setTick((t) => t + 1),
  };
}
