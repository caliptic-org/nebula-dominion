'use client';

import { useEffect, useState } from 'react';

/* Galaxy map state client.
 *
 * Calls api at `GET /api/v1/map/state` which returns a list of bases scattered
 * across the sector grid (one per race + the player). The local GalaxyMapScreen
 * keeps its hand-authored `GALAXY_NODES` for the cinematic visuals; this hook
 * surfaces the live data so the page can decorate the screen with real numbers
 * (player base level / power, enemy capital tags). */

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '') + '/api/v1';

export interface GalaxyBase {
  id: string;
  col: number;
  row: number;
  race: string;
  name: string;
  level: number;
  power: number;
  isPlayer?: boolean;
}

interface GalaxyMapState {
  bases: GalaxyBase[];
  [key: string]: unknown;
}

interface UseGalaxyMapResult {
  state: GalaxyMapState | null;
  playerBase: GalaxyBase | null;
  loading: boolean;
  error: string | null;
}

export function useGalaxyMap(): UseGalaxyMapResult {
  const [state, setState] = useState<GalaxyMapState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/map/state`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as GalaxyMapState;
        if (!cancelled) setState(data);
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
  }, []);

  const playerBase = state?.bases.find((b) => b.isPlayer) ?? null;
  return { state, playerBase, loading, error };
}
