'use client';

import { useEffect, useState } from 'react';

/* Static building catalog client — calls game-server's public
 * GET /api/buildings/types and returns the BUILDING_CONFIGS list.
 *
 * Each entry is generic (StarCraft-style: COMMAND_CENTER, MINERAL_EXTRACTOR…)
 * and not race-specific; the build menu UI keeps its race-flavoured names
 * from `RACES[race].buildings` and overlays these numbers as a backend hint.
 *
 * No auth required. Falls back to `[]` on error so the page can still render
 * its full race-specific catalog. */

const GAME_SERVER_BASE = (
  process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

export interface BuildingTypeDto {
  type: string;
  buildTimeSeconds: number;
  cost: { mineral: number; gas: number; energy: number };
  production: { mineralPerTick: number; gasPerTick: number; energyPerTick: number };
  energyConsumptionPerTick: number;
  maxPerPlayer: number;
  description: string;
}

interface UseBuildingTypesResult {
  types: BuildingTypeDto[];
  loading: boolean;
  error: string | null;
}

export function useBuildingTypes(): UseBuildingTypesResult {
  const [types, setTypes] = useState<BuildingTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${GAME_SERVER_BASE}/api/buildings/types`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as BuildingTypeDto[];
        if (!cancelled) setTypes(Array.isArray(data) ? data : []);
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

  return { types, loading, error };
}
