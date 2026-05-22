'use client';

import { useMemo } from 'react';
import type { NDRace } from '@/components/handoff/nd-tokens';

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

// TODO(@Backend Developer): Wire to /api/units/merge-preview once the merge
// service exists. Mention: aaaaaaaa-0002-4000-a000-000000000002. For now this
// hook is a deterministic, race/tier-driven placeholder so the Birleştirme
// screen can be designed and demoed against real data shape.
const BASE_SUCCESS: Record<number, number> = {
  2: 92,
  3: 78,
  4: 55,
};

export function useMergePreview({
  race,
  sourceTier,
  selectedCount,
  slotCount,
}: MergePreviewInput): MergePreview {
  return useMemo(() => {
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
  }, [race, sourceTier, selectedCount, slotCount]);
}
