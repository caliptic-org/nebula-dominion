'use client';

import { useEffect, useState } from 'react';
import { getAccessToken, hasSession } from '@/lib/session';

/* Live owned-buildings roster from game-server's `/api/buildings` endpoint.
 *
 * Mirrors useGameUnits but for buildings. Used by /base to surface real
 * per-building level + status (constructing vs active) on the focused
 * building card instead of the race-token-only placeholder.
 *
 * Poll cadence: 30s — slower than resources because buildings change
 * only via construction events. */

const GAME_SERVER_BASE = (
  process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

export interface PlayerBuildingDto {
  id: string;
  playerId: string;
  type: string;
  level: number;
  status: 'constructing' | 'active' | 'destroyed';
  positionX: number;
  positionY: number;
  constructionStartedAt: string | null;
  constructionCompleteAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseGameBuildingsResult {
  data: PlayerBuildingDto[] | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
}

const POLL_MS = 30_000;

export function useGameBuildings(): UseGameBuildingsResult {
  const [data, setData] = useState<PlayerBuildingDto[] | null>(null);
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
        const res = await fetch(`${GAME_SERVER_BASE}/api/buildings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PlayerBuildingDto[];
        if (!cancelled) {
          setData(Array.isArray(json) ? json : []);
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
  }, []);

  return { data, loading, error, authenticated };
}

/** Buildings keyed by their lowercase type. Helps /base look up the
 *  player's owned instance of a particular building slot quickly. */
export function indexBuildingsByType(
  bldgs: PlayerBuildingDto[],
): Map<string, PlayerBuildingDto[]> {
  const map = new Map<string, PlayerBuildingDto[]>();
  for (const b of bldgs) {
    const list = map.get(b.type) ?? [];
    list.push(b);
    map.set(b.type, list);
  }
  return map;
}
