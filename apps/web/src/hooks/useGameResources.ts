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
        if (!cancelled) {
          setLoading(false);
          // Re-arm the poll AFTER each completion so a slow response doesn't
          // pile up overlapping requests.
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

/** Compact 12,480 → "12,480" / 1,234,567 → "1.2M" formatter for the HUD. */
export function formatResource(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}K`;
  return Number(n).toLocaleString('tr-TR');
}
