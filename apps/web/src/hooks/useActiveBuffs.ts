'use client';

import { useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

/* Player's non-expired buffs from `GET /buffs/active` (JWT only).
 *
 * Mirrors the useGameResources shape: `data` is `null` for guests so the
 * profile screen keeps its honest "no active buffs" empty state without
 * flicker, otherwise an array (possibly empty) of timed buff entries.
 *
 * Poll cadence: 30s — buffs are short-lived (~minutes to hours) so a half-
 * minute is short enough that an expired entry never lingers on screen
 * for more than a tick. Re-arms after each completion to avoid stacking
 * requests on a slow connection. */

export interface ActiveBuff {
  id: string;
  label: string;
  effect: string;
  /** ISO timestamp when this buff stops applying. */
  expiresAt: string;
  /** Total duration in seconds — used by the UI to draw a percentage bar. */
  totalSec: number;
}

interface UseActiveBuffsResult {
  data: ActiveBuff[] | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
}

const POLL_MS = 30_000;

export function useActiveBuffs(): UseActiveBuffsResult {
  const [data, setData] = useState<ActiveBuff[] | null>(null);
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
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchOnce() {
      try {
        const json = await api.get<ActiveBuff[]>('/buffs/active');
        if (!cancelled) {
          setData(Array.isArray(json) ? json : []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          // Stale token / 401 → drop back to guest state silently. Other
          // errors get surfaced so the consumer can show a hint.
          if (err instanceof FetchError && err.status === 401) {
            setAuthenticated(false);
            setData(null);
          } else {
            setError(err instanceof Error ? err.message : String(err));
          }
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
  }, []);

  return { data, loading, error, authenticated };
}
