'use client';

import { useEffect, useState } from 'react';
import { toBackendRace } from '@/lib/race-api';
import type { NDRaceKey } from '@/components/handoff/nd-tokens';

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '') + '/api/v1';

export interface CommanderDto {
  id: string;
  name: string;
  title: string;
  race: 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';
  level: number;
  tier: 'BAŞ KOMUTAN' | 'TIER 2' | 'TIER 3' | 'TIER 4' | 'TIER 5';
  skill: string;
  unlocked: boolean;
  portrait: string;
}

/* Race-specific commander roster. Comes from the meta stub controller —
 * mirrors `RACES[race].commanders` for now but lets the UI round-trip the
 * data so it can swap to a real player-progression backend later. */
export function useCommanders(race: NDRaceKey | null) {
  const [commanders, setCommanders] = useState<CommanderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // `null` fetches the full 20-commander roster across all races. Useful for
    // the /commanders gallery where client-side filtering toggles between
    // races without re-fetching. The FE-to-BE race-key adapter would convert
    // 'insan' → 'human', but the meta stub speaks local keys, so we pass the
    // local key directly.
    void toBackendRace;
    const url = race
      ? `${API_BASE}/commanders?race=${encodeURIComponent(race)}`
      : `${API_BASE}/commanders`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as CommanderDto[];
        if (!cancelled) setCommanders(Array.isArray(data) ? data : []);
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

  return { commanders, loading, error };
}
