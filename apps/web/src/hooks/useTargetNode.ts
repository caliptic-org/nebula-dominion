'use client';

import { useEffect, useState } from 'react';

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '') + '/api/v1';

export interface TargetNodeDto {
  id: string;
  name: string;
  kind: 'capital' | 'outpost' | 'asteroid' | 'nebula' | 'temple';
  ownerRace: 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan' | null;
  ownerName: string | null;
  level: number;
  power: number;
  defence: number;
  garrison: { units: number; tier: number; lastDeploy: string };
  rewards: { gold: number; gems: number; xp: number };
  status: 'active' | 'idle' | 'under-attack';
}

/* Galaxy target detail. Calls the meta stub `/target/:id` which falls back to
 * a synthesised node when the id isn't in the seed. */
export function useTargetNode(id: string | null) {
  const [target, setTarget] = useState<TargetNodeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/target/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as TargetNodeDto;
        if (!cancelled) setTarget(json);
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
  }, [id]);

  return { target, loading, error };
}
