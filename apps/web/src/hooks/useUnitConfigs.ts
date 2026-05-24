'use client';

import { useEffect, useState } from 'react';
import type { NDRaceKey } from '@/components/handoff/nd-tokens';
import { toBackendRace } from '@/lib/race-api';

/* Race-specific unit catalog client.
 *
 * Calls game-server's public `GET /api/units/configs/:race`. Like
 * /buildings/types it returns static configuration (cost / train time /
 * tier) so the production menu can show real backend numbers next to the
 * race-flavoured unit names from `RACES[race].units`.
 *
 * No auth required. Falls back to `[]` on error / network outage. */

const GAME_SERVER_BASE = (
  process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

export interface UnitConfigDto {
  type: string;
  tier: number;
  cost: { mineral: number; gas: number; energy?: number };
  trainTimeSeconds: number;
  populationCost?: number;
  attack?: number;
  hp?: number;
  description?: string;
  [key: string]: unknown;
}

interface UseUnitConfigsResult {
  configs: UnitConfigDto[];
  loading: boolean;
  error: string | null;
}

export function useUnitConfigs(race: NDRaceKey | null): UseUnitConfigsResult {
  const [configs, setConfigs] = useState<UnitConfigDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!race) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const backendRace = toBackendRace(race);
    fetch(`${GAME_SERVER_BASE}/api/units/configs/${backendRace}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as UnitConfigDto[];
        if (!cancelled) setConfigs(Array.isArray(data) ? data : []);
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
  }, [race]);

  return { configs, loading, error };
}
