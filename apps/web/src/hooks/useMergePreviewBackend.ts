'use client';

import { useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';
import type { NDRaceKey } from '@/components/handoff/nd-tokens';

/* Backend-validated merge preview.
 *
 * Calls POST /api/v1/units/merge-preview with the 3 selected unit IDs. The
 * api validates the slot recipe + returns the would-be result unit, costs,
 * and rejection reasons.
 *
 * The existing client-side `useMergePreview` (deterministic, race/tier-based)
 * stays in place for instant UI feedback; this hook layers the authoritative
 * verdict on top so a "Birleştir" press only fires when canMerge=true.
 *
 * Falls back to `null` when fewer than 3 slots are filled (the backend
 * requires exactly 3 entries). */

export interface MergePreviewBackend {
  canMerge: boolean;
  resultUnitId: string | null;
  resultTier: number | null;
  costs: { resourceA: number; resourceB: number; crystal?: number };
  consumed: string[];
  reasons?: string[];
}

export function useMergePreviewBackend(
  race: NDRaceKey,
  slotUnitIds: (string | null)[],
): { preview: MergePreviewBackend | null; loading: boolean; error: string | null } {
  const [preview, setPreview] = useState<MergePreviewBackend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable key for the effect so we don't refire on identical arrays.
  const key = slotUnitIds.map((s) => s ?? '_').join('|') + `|${race}`;
  const filled = slotUnitIds.filter((s): s is string => !!s);

  useEffect(() => {
    if (filled.length !== 3) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .post<MergePreviewBackend>('/units/merge-preview', {
        race,
        slots: filled.map((unitId, idx) => ({ slotIndex: idx, unitId })),
      })
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof FetchError && err.status === 400) {
          // 400 with reasons[] is a normal "this recipe doesn't merge" verdict.
          const data = err.data as { reasons?: string[] } | null;
          setPreview({
            canMerge: false,
            resultUnitId: null,
            resultTier: null,
            costs: { resourceA: 0, resourceB: 0 },
            consumed: [],
            reasons: data?.reasons ?? [err.message],
          });
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { preview, loading, error };
}
