'use client';

import { useEffect, useState } from 'react';
import { getAccessToken, hasSession } from '@/lib/session';

/* Live in-game resources from game-server's `/api/buildings/resources` endpoint.
 *
 * The HUD on /base and /base/build previously showed hardcoded mock values
 * (12,480 / 3,210 / 42) regardless of the player's actual balance. Once the
 * player has a JWT, this hook polls the game-server every 5 seconds so the
 * HUD reflects the real wallet (matching the design's "always-live" feel).
 *
 * Unauthenticated visitors (guest mode) get `data: null` so the page can
 * keep its mock placeholders without flicker — same pattern as useBaseState.
 *
 * Why a separate hook from useBaseState: game-server has its own JWT
 * pipeline (HttpJwtGuard) and its own base URL (NEXT_PUBLIC_GAME_SERVER_URL),
 * so the request shape differs from `api.get(...)`. Co-locating it would
 * couple the two backends in a single hook for no benefit.
 */

const GAME_SERVER_BASE = (
  process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

export interface ResourceSnapshotDto {
  mineral: number;
  gas: number;
  energy: number;
  population: number;
  mineralCap: number;
  gasCap: number;
  energyCap: number;
  populationCap: number;
  mineralPerTick: number;
  gasPerTick: number;
  energyPerTick: number;
  populationPerTick: number;
  lastTickAt: string | null;
}

interface UseGameResourcesResult {
  data: ResourceSnapshotDto | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
}

const POLL_MS = 5000;

/** Cross-tree refresh signal — any component (e.g. a mission-claim button
 *  in a different render branch from the HUD) can call this to force every
 *  mounted useGameResources to refetch immediately. Avoids waiting for the
 *  5s poll after a wallet-changing action. SSR-safe — falls back to a no-op
 *  before the window object exists. */
export const WALLET_REFETCH_EVENT = 'nebula:wallet:refetch';
export function refreshGameResources(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WALLET_REFETCH_EVENT));
}

export function useGameResources(): UseGameResourcesResult {
  const [data, setData] = useState<ResourceSnapshotDto | null>(null);
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

    async function fetchOnce(opts: { rearm?: boolean } = { rearm: true }) {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setAuthenticated(false);
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(`${GAME_SERVER_BASE}/api/buildings/resources`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as ResourceSnapshotDto;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled && opts.rearm !== false) {
          setLoading(false);
          // Re-arm the poll AFTER each completion so a slow response doesn't
          // pile up overlapping requests.
          timer = setTimeout(() => fetchOnce({ rearm: true }), POLL_MS);
        } else if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchOnce({ rearm: true });

    // Event-driven refetch — any module that mutates the wallet (mission
    // claim, building construction, unit train) can `refreshGameResources()`
    // and every mounted instance picks it up without a 5s wait. The current
    // poll timer stays running so cancellation semantics don't change.
    const handler = () => {
      void fetchOnce({ rearm: false });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(WALLET_REFETCH_EVENT, handler);
    }

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener(WALLET_REFETCH_EVENT, handler);
      }
    };
  }, []);

  return { data, loading, error, authenticated };
}

/** Compact 12,480 → "12,480" / 1,234,567 → "1.2M" formatter for the HUD. */
export function formatResource(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}K`;
  return Number(n).toLocaleString('tr-TR');
}
