'use client';

import { useNDRace } from '@/components/handoff/useNDRace';
import type { ResourceField } from '@/lib/nd-tokens';
import { useTierProgress } from './useTierProgress';
import { useGameResources, type ResourceSnapshotDto } from './useGameResources';

const HUD_PLACEHOLDER = '—';

export interface HudState {
  level: number;
  levelName: string;
  age: number;
  xpPercent: number;
  resA: string;
  resB: string;
  crystal: string;
  /** Per-tick production rates (raw numbers from game-server snapshot).
   *  Used by the resource help popover so the player sees concrete
   *  "+5/tick" instead of a vague "build a resource building". 0 = no
   *  production yet; undefined = data hasn't arrived. */
  resAPerTick?: number;
  resBPerTick?: number;
  crystalPerTick?: number;
  /** Storage caps — popover shows "X / Y" so the player knows if
   *  they're capped out and shouldn't bother investing yet. */
  resACap?: number;
  resBCap?: number;
  crystalCap?: number;
  /** Science points (earned from battles + garrisoned galaxy nodes).
   *  Not yet rendered as its own HUD pill but exposed for consumers like
   *  the battle-result toast / research panel. Always read from the same
   *  /api/buildings/resources snapshot the other pills consume so it
   *  stays consistent. */
  science?: number;
  sciencePerTick?: number;
  scienceCap?: number;
  loading: boolean;
}

function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) {
    return HUD_PLACEHOLDER;
  }
  return Math.floor(amount).toLocaleString();
}

/** Pick the right snapshot value for a race-themed slot.
 *  Returns `undefined` when the snapshot is missing or the field maps to
 *  a non-ticking resource — caller falls back to the placeholder. */
function readField(
  snap: ResourceSnapshotDto | null | undefined,
  field: ResourceField,
): number | undefined {
  if (!snap) return undefined;
  return snap[field];
}

function readPerTick(
  snap: ResourceSnapshotDto | null | undefined,
  field: ResourceField,
): number | undefined {
  if (!snap) return undefined;
  switch (field) {
    case 'mineral': return snap.mineralPerTick;
    case 'gas':     return snap.gasPerTick;
    case 'energy':  return snap.energyPerTick;
    // Science has no `sciencePerTick` field on the snapshot today (it's a
    // grant-only resource) so we report 0 to make the popover show "0/tick"
    // rather than "—" which the player would read as "not loaded".
    case 'science': return 0;
  }
}

function readCap(
  snap: ResourceSnapshotDto | null | undefined,
  field: ResourceField,
): number | undefined {
  if (!snap) return undefined;
  switch (field) {
    case 'mineral': return snap.mineralCap;
    case 'gas':     return snap.gasCap;
    case 'energy':  return snap.energyCap;
    case 'science': return snap.scienceCap;
  }
}

/**
 * Surfaces the live game state required by the HUD / TierBanner.
 *
 * Level + tier name come from api's /tier/progress (54-level model).
 *
 * Resource amounts come from game-server's /api/buildings/resources —
 * that's where the live wallet lives. The earlier implementation went
 * through api's /games + /resources, which returned empty for accounts
 * that hadn't joined a match (the common case during normal play), so
 * the HUD rendered placeholders even though the player had real
 * mineral/gas/energy.
 *
 * ## Mapping
 * Per-race binding is declared in `nd-tokens.ts` via `Resource.field`.
 * Today every race uses:
 *   resA → mineral   (Kredi / Biyokütle / Mineral / Vahşi Et / Ruh Özü)
 *   resB → gas       (Yakıt / Genetik / Hesap / Kan Özü / Karanlık Md.)
 *   crystal → energy (universal — "Enerji" / "Kristal")
 *
 * Insan's slot B used to be labelled "Bilim" (literal Turkish for
 * "Science") which collided with the backend's separate `science` field.
 * The label was renamed to "Yakıt" (fuel) to make the gas binding honest
 * — see Resource.field commentary in nd-tokens.ts for the full reasoning.
 *
 * Both data sources gracefully degrade to placeholders so screens
 * never render the legacy "Level 9 / Metropol / 12,480 / 3,210 / 42"
 * mock values.
 */
export function useHudState(): HudState {
  const race = useNDRace();
  const { progress, xpPercent, loading: tierLoading } = useTierProgress();
  const { data: resources, loading: resourcesLoading } = useGameResources();

  const fieldA = race.resourceA.field;
  const fieldB = race.resourceB.field;
  // The third pill is the universal energy slot — always reads `energy`,
  // independent of race.
  const fieldCrystal: ResourceField = 'energy';

  return {
    level: progress?.currentLevel ?? 1,
    levelName: progress?.currentTierName ?? HUD_PLACEHOLDER,
    age: progress?.currentAge ?? 1,
    xpPercent,
    resA: formatAmount(readField(resources, fieldA)),
    resB: formatAmount(readField(resources, fieldB)),
    crystal: formatAmount(readField(resources, fieldCrystal)),
    resAPerTick: readPerTick(resources, fieldA),
    resBPerTick: readPerTick(resources, fieldB),
    crystalPerTick: readPerTick(resources, fieldCrystal),
    resACap: readCap(resources, fieldA),
    resBCap: readCap(resources, fieldB),
    crystalCap: readCap(resources, fieldCrystal),
    science: resources?.science,
    // No live per-tick stream yet; sciencePerTick is grant-only (battles
    // + galaxy nodes). Surface undefined so consumers can render a
    // placeholder rather than "0".
    sciencePerTick: undefined,
    scienceCap: resources?.scienceCap,
    loading: tierLoading || resourcesLoading,
  };
}
