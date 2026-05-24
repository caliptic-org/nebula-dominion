'use client';

import { useEffect, useState } from 'react';
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
}

const POLL_MS = 30_000;

export function useGameUnits(): UseGameUnitsResult {
  const [data, setData] = useState<PlayerUnitDto[] | null>(null);
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
  }, []);

  return { data, loading, error, authenticated };
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
