'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAccessToken, hasSession } from '@/lib/session';

/* Live player-units roster from game-server's `/api/units` endpoint.
 *
 * Returns the authenticated user's owned units (player_units table). When
 * unauthenticated returns null. When authenticated and the player has no
 * units (fresh account), returns []. /inventory and /battle-prep page the
 * roster through this hook so empty-state fires correctly instead of
 * synthesised fake counts.
 *
 * Poll cadence: 30s — slower than resources because the roster changes
 * only when the player trains/loses units, both of which can trigger a
 * manual refetch via the returned `refresh` callback later. */

const GAME_SERVER_BASE = (
  process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

export interface PlayerUnitDto {
  id: string;
  playerId: string;
  type: string;
  race: 'human' | 'zerg' | 'automaton';
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  positionX: number;
  positionY: number;
  abilities: string[];
  isAlive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseGameUnitsResult {
  data: PlayerUnitDto[] | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
  /** Force a fresh GET /api/units outside the poll cadence — used by the
   *  /inventory upgrade flow so the player sees the bumped level instantly
   *  instead of waiting up to 30s for the next tick. */
  refresh: () => void;
}

const POLL_MS = 30_000;

// ── Cross-tree refresh signal ──────────────────────────────────────────────
// Any module that mutates the roster (merge, train completion, battle
// casualties…) can call `refreshGameUnits()` and every mounted hook picks
// up the new list without waiting for the next 30s tick. Same pattern as
// refreshGameResources / refreshBuildings.
export const UNITS_REFETCH_EVENT = 'nebula:units:refetch';

export function refreshGameUnits(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(UNITS_REFETCH_EVENT));
}

export function useGameUnits(): UseGameUnitsResult {
  const [data, setData] = useState<PlayerUnitDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [bump, setBump] = useState(0);

  const refresh = useCallback(() => setBump((n) => n + 1), []);

  // Listen for the global refresh event so refreshGameUnits() bumps every
  // mounted consumer even across unrelated component trees.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setBump((n) => n + 1);
    window.addEventListener(UNITS_REFETCH_EVENT, handler);
    return () => window.removeEventListener(UNITS_REFETCH_EVENT, handler);
  }, []);

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
        const res = await fetch(`${GAME_SERVER_BASE}/api/units`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PlayerUnitDto[];
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
  }, [bump]);

  return { data, loading, error, authenticated, refresh };
}

/** Count units grouped by type. Useful when /inventory wants "5 marines,
 *  2 medics" style aggregations without re-rendering per unit. */
export function groupUnitsByType(units: PlayerUnitDto[]): Map<string, PlayerUnitDto[]> {
  const map = new Map<string, PlayerUnitDto[]>();
  for (const u of units) {
    if (!u.isAlive) continue;
    const list = map.get(u.type) ?? [];
    list.push(u);
    map.set(u.type, list);
  }
  return map;
}
