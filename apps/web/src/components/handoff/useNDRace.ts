'use client';

import { useEffect, useState } from 'react';
import { RACES, type NDRace, type NDRaceKey } from './nd-tokens';

const STORAGE_KEY = 'nebula:race-commitment:v1';
const RACE_KEYS: readonly NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];

function readCommittedRaceKey(): NDRaceKey | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { race?: string };
    if (parsed?.race && (RACE_KEYS as readonly string[]).includes(parsed.race)) {
      return parsed.race as NDRaceKey;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Reads the committed race from localStorage (set by useRaceCommitment),
 * returns the matching handoff NDRace. Falls back to `fallback` (default
 * 'insan') until the client-side read settles, then re-renders with the
 * real value. Also reflects the race onto <html data-race> so global
 * CSS variables (--nd-race etc.) track the active race.
 */
export function useNDRace(fallback: NDRaceKey = 'insan'): NDRace {
  const [key, setKey] = useState<NDRaceKey>(fallback);

  useEffect(() => {
    const committed = readCommittedRaceKey();
    if (committed && committed !== key) setKey(committed);
  }, [key]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-race', key);
  }, [key]);

  return RACES[key];
}
