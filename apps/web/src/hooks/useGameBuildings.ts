'use client';

import { useEffect, useReducer } from 'react';
import { getAccessToken, hasSession } from '@/lib/session';

/* Live owned-buildings roster — module-level singleton poll.
 *
 * Multiple components on the same page (e.g. /base/production calls it
 * for both the training-building lookup and the building-countdown badge)
 * used to spin up independent 30 s timers.  Converted to the same
 * singleton pattern as useGameResources: one fetch loop, N subscribers.
 *
 * Poll cadence: 30 s (unchanged — buildings change only via construction
 * events, so we don't need the 5 s cadence used by resources).
 *
 * `refreshBuildings()` exported for call-sites that need an immediate
 * re-fetch after a construction POST (mirrors refreshGameResources). */

const GAME_SERVER_BASE = (
  process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

export interface PlayerBuildingDto {
  id: string;
  playerId: string;
  type: string;
  level: number;
  status: 'constructing' | 'active' | 'destroyed';
  positionX: number;
  positionY: number;
  constructionStartedAt: string | null;
  constructionCompleteAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseGameBuildingsResult {
  data: PlayerBuildingDto[] | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
}

// ── Singleton state ────────────────────────────────────────────────────────
let sData: PlayerBuildingDto[] | null = null;
let sLoading = true;
let sError: string | null = null;
let sAuthenticated = false;

const sListeners = new Set<() => void>();
let sTimer: ReturnType<typeof setTimeout> | null = null;
let sRunning = false;

const POLL_MS = 30_000;

export const BUILDINGS_REFETCH_EVENT = 'nebula:buildings:refetch';

export function refreshBuildings(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BUILDINGS_REFETCH_EVENT));
}

function notify() {
  sListeners.forEach((fn) => fn());
}

async function fetchOnce(opts: { rearm: boolean } = { rearm: true }) {
  if (!hasSession()) {
    sAuthenticated = false;
    sLoading = false;
    notify();
    return;
  }
  const token = getAccessToken();
  if (!token) {
    sAuthenticated = false;
    sLoading = false;
    notify();
    return;
  }
  sAuthenticated = true;
  try {
    const res = await fetch(`${GAME_SERVER_BASE}/api/buildings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as PlayerBuildingDto[];
    sData = Array.isArray(json) ? json : [];
    sError = null;
  } catch (err) {
    sError = err instanceof Error ? err.message : String(err);
  } finally {
    sLoading = false;
    notify();
    if (opts.rearm && sRunning) {
      sTimer = setTimeout(() => void fetchOnce({ rearm: true }), POLL_MS);
    }
  }
}

function startPolling() {
  if (sRunning) return;
  sRunning = true;
  void fetchOnce({ rearm: true });
}

function stopPolling() {
  sRunning = false;
  if (sTimer !== null) { clearTimeout(sTimer); sTimer = null; }
  sData = null;
  sLoading = true;
  sError = null;
  sAuthenticated = false;
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useGameBuildings(): UseGameBuildingsResult {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    sListeners.add(forceUpdate);
    startPolling();

    const onRefetch = () => void fetchOnce({ rearm: false });
    if (typeof window !== 'undefined') {
      window.addEventListener(BUILDINGS_REFETCH_EVENT, onRefetch);
    }

    return () => {
      sListeners.delete(forceUpdate);
      if (typeof window !== 'undefined') {
        window.removeEventListener(BUILDINGS_REFETCH_EVENT, onRefetch);
      }
      if (sListeners.size === 0) stopPolling();
    };
  }, [forceUpdate]);

  return { data: sData, loading: sLoading, error: sError, authenticated: sAuthenticated };
}

/** Buildings keyed by their lowercase type. */
export function indexBuildingsByType(
  bldgs: PlayerBuildingDto[],
): Map<string, PlayerBuildingDto[]> {
  const map = new Map<string, PlayerBuildingDto[]>();
  for (const b of bldgs) {
    const list = map.get(b.type) ?? [];
    list.push(b);
    map.set(b.type, list);
  }
  return map;
}
