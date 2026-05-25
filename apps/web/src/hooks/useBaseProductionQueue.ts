'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAccessToken, hasSession } from '@/lib/session';
import type { ProductionQueueItem } from '@/components/hud/UnitProductionQueue';

/* Polls the per-base production queue introduced in CAL-586.
 *
 * The endpoint is  GET /api/bases/:id/production-queue  where :id is the
 * player's COMMAND_CENTER building UUID.  The hook derives that UUID from the
 * buildings roster (useGameBuildings) rather than accepting it as a prop so
 * callers don't have to thread the ID through multiple layers.
 *
 * When the player has no COMMAND_CENTER yet (fresh account before tutorial
 * completes), `baseId` is null and the hook returns an empty queue without
 * making any network requests.
 *
 * Poll cadence matches the training-queue hook (30s).  Call `refresh()` to
 * force an immediate re-fetch (e.g. after a POST /production-queue enqueue). */

const GAME_SERVER_BASE = (
  process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

interface RawQueueItem {
  id: string;
  unitType: string;
  unitEmoji: string;
  unitName: string;
  level: number;
  position: number;
  totalDurationSeconds: number;
  remainingSeconds: number;
  startedAt: string;
}

interface RawQueueResponse {
  queue: RawQueueItem[];
}

interface UseBaseProductionQueueResult {
  queue: ProductionQueueItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const POLL_MS = 30_000;

export function useBaseProductionQueue(
  baseId: string | null,
): UseBaseProductionQueueResult {
  const [queue, setQueue] = useState<ProductionQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!baseId || !hasSession()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setLoading(true);

    async function fetchOnce() {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `${GAME_SERVER_BASE}/api/bases/${baseId}/production-queue`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as RawQueueResponse;
        if (!cancelled) {
          const items: ProductionQueueItem[] = (json.queue ?? []).map((r) => ({
            id: r.id,
            unitType: r.unitName || r.unitType,
            unitEmoji: r.unitEmoji || '⚔️',
            level: r.level,
            queuePosition: r.position,
            totalTimeSeconds: r.totalDurationSeconds,
            remainingTimeSeconds: r.remainingSeconds,
          }));
          setQueue(items);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
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
  }, [baseId, tick]);

  return { queue, loading, error, refresh };
}
