'use client';

import { useEffect, useMemo, useState } from 'react';
import type { NDRace } from '@/components/handoff/nd-tokens';
import { gameServerApi } from '@/lib/game-server-api';

export interface MergePreviewInput {
  race: NDRace;
  sourceTier: number;
  selectedCount: number;
  slotCount: number;
}

export interface MergePreview {
  promotedTier: number;
  promotedName: string;
  successRate: number;
  projectedRate: number;
  canMerge: boolean;
  riskLabel: 'GÜVENLİ' | 'RİSKLİ' | 'KRİTİK';
}

// Frontend fallback used while the backend GET /units/merge/preview round-trip
// is in-flight (or if the network is offline).  Mirrors the backend formula
// so hydration and live values agree.
const BASE_SUCCESS: Record<number, number> = {
  2: 92,
  3: 78,
  4: 55,
};

function clientPreview({
  race,
  sourceTier,
  selectedCount,
  slotCount,
}: MergePreviewInput): MergePreview {
  const promotedTier = Math.min(5, sourceTier + 1);
  const promotedName =
    race.units.find((u) => u.t === promotedTier)?.n ??
    race.units[race.units.length - 1].n;
  const successRate = BASE_SUCCESS[sourceTier] ?? 60;
  const slotProgress = selectedCount / slotCount;
  const projectedRate = Math.round(successRate * slotProgress);
  const canMerge = selectedCount === slotCount;
  const riskLabel: MergePreview['riskLabel'] =
    successRate >= 80 ? 'GÜVENLİ' : successRate >= 60 ? 'RİSKLİ' : 'KRİTİK';
  return { promotedTier, promotedName, successRate, projectedRate, canMerge, riskLabel };
}

interface BackendPreview {
  promotedTier:  number;
  successRate:   number;
  projectedRate: number;
  canMerge:      boolean;
  riskLabel:     'GÜVENLİ' | 'RİSKLİ' | 'KRİTİK';
}

/**
 * Hook returns the merge preview for the currently-selected unit set.  The
 * backend is the source of truth (GET /units/merge/preview, stateless) — the
 * local formula is kept only as an offline-safe SSR fallback so the UI shows
 * something while the round-trip resolves.
 */
export function useMergePreview(input: MergePreviewInput): MergePreview {
  // Local mirror used for instant UI updates + SSR hydration.
  const local = useMemo(() => clientPreview(input), [input.race, input.sourceTier, input.selectedCount, input.slotCount]);

  const [serverNumbers, setServerNumbers] = useState<BackendPreview | null>(null);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({
      sourceTier:    String(input.sourceTier),
      selectedCount: String(input.selectedCount),
      slotCount:     String(input.slotCount),
    }).toString();
    gameServerApi
      .get<BackendPreview>(`/units/merge/preview?${qs}`)
      .then((data) => { if (!cancelled) setServerNumbers(data); })
      .catch(() => { /* keep local fallback */ });
    return () => { cancelled = true; };
  }, [input.sourceTier, input.selectedCount, input.slotCount]);

  // Promoted unit NAME is purely race-flavoured naming — backend doesn't
  // know about the localized race lex, so it never overrides this field.
  return serverNumbers
    ? { ...serverNumbers, promotedName: local.promotedName }
    : local;
}
