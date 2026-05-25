'use client';

import { useEffect, useReducer } from 'react';
import { getAccessToken, hasSession } from '@/lib/session';

/* Live in-game resources from game-server's `/api/buildings/resources`.
 *
 * ## Singleton poll design
 * Previous design: every `useGameResources()` call started its own 5-second
 * timer → N mounted consumers = N parallel identical requests.  On the
 * /base/building/[slug] page alone the HUD (via useHudState) + the page
 * component both called the hook, producing 2 requests per tick; on pages
 * with more HUD-like widgets the count climbed to 6+.
 *
 * New design: **one fetch loop at module scope**, shared by all consumers.
 * Individual hook calls just subscribe to the shared state via a force-
 * update callback registered in a `Set`.  No matter how many components
 * mount, exactly one network request fires per poll cycle.
 *
 * The public API (return shape, `refreshGameResources`, event name) is
 * unchanged so all call-sites keep working without modification.
 */

const GAME_SERVER_BASE = (
  process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

export interface ResourceSnapshotDto {
  mineral: number;
  gas: number;
  energy: number;
  population: number;
  mineralCap: number;
  gasCap: number;
  energyCap: number;
  populationCap: number;
  mineralPerTick: number;
  gasPerTick: number;
  energyPerTick: number;
  populationPerTick: number;
  lastTickAt: string | null;
}

interface UseGameResourcesResult {
  data: ResourceSnapshotDto | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
}

// ── Singleton state ────────────────────────────────────────────────────────
let sData: ResourceSnapshotDto | null = null;
let sLoading = true;
let sError: string | null = null;
let sAuthenticated = false;

// All mounted hook instances register a forceUpdate here.
const sListeners = new Set<() => void>();

// Single shared timer + in-flight guard.
let sTimer: ReturnType<typeof setTimeout> | null = null;
let sRunning = false;

// Generation counter: incremented on every startPolling/stopPolling cycle.
// An in-flight fetchOnce checks its captured generation against this before
// arming a new timer — stale callbacks from previous cycles are silently
// dropped.  This prevents React 18 StrictMode's "mount → unmount → remount"
// lifecycle from creating multiple concurrent polling loops.
let sGeneration = 0;

const POLL_MS = 5_000;

function notify() {
  sListeners.forEach((fn) => fn());
}

async function fetchOnce(gen: number, opts: { rearm: boolean } = { rearm: true }) {
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
    const res = await fetch(`${GAME_SERVER_BASE}/api/buildings/resources`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    sData = (await res.json()) as ResourceSnapshotDto;
    sError = null;
  } catch (err) {
    sError = err instanceof Error ? err.message : String(err);
  } finally {
    sLoading = false;
    notify();
    // Only rearm if this fetch belongs to the current generation and the loop
    // is still running.  Stale fetches (from a previous StrictMode cycle) must
    // not arm new timers.
    if (gen === sGeneration && opts.rearm && sRunning) {
      sTimer = setTimeout(() => void fetchOnce(sGeneration, { rearm: true }), POLL_MS);
    }
  }
}

function startPolling() {
  if (sRunning) return; // idempotent
  sRunning = true;
  const gen = ++sGeneration;
  void fetchOnce(gen, { rearm: true });
}

function stopPolling() {
  sRunning = false;
  sGeneration++; // invalidate any in-flight fetchOnce from the previous cycle
  if (sTimer !== null) {
    clearTimeout(sTimer);
    sTimer = null;
  }
  // Reset state so next mount starts fresh (user logged out / navigated away).
  sData = null;
  sLoading = true;
  sError = null;
  sAuthenticated = false;
}

// HMR safety: when the module hot-reloads in dev, kill any timer from the
// previous module version so we don't accumulate stale polling loops.
if (typeof window !== 'undefined') {
  const HMR_KEY = '__nebula_resources_stop__';
  const prev = (window as Record<string, unknown>)[HMR_KEY] as (() => void) | undefined;
  if (prev) prev();
  (window as Record<string, unknown>)[HMR_KEY] = stopPolling;
}

// ── Cross-tree refresh signal ──────────────────────────────────────────────
// Any module that mutates the wallet (mission claim, building construction,
// unit train…) can call `refreshGameResources()` and every mounted consumer
// picks up the new value without waiting for the next 5 s tick.
export const WALLET_REFETCH_EVENT = 'nebula:wallet:refetch';

export function refreshGameResources(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WALLET_REFETCH_EVENT));
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useGameResources(): UseGameResourcesResult {
  // Each consumer gets a private forceUpdate so React re-renders the
  // component whenever shared state changes.
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    sListeners.add(forceUpdate);

    // First consumer starts the poll; subsequent ones just subscribe.
    startPolling();

    // Event-driven refetch — fires a one-shot fetch without rearming the
    // normal timer (so the scheduled tick still fires on schedule).
    const onRefetch = () => void fetchOnce(sGeneration, { rearm: false });
    if (typeof window !== 'undefined') {
      window.addEventListener(WALLET_REFETCH_EVENT, onRefetch);
    }

    return () => {
      sListeners.delete(forceUpdate);
      if (typeof window !== 'undefined') {
        window.removeEventListener(WALLET_REFETCH_EVENT, onRefetch);
      }
      // Last consumer leaving — stop the shared poll loop.
      if (sListeners.size === 0) stopPolling();
    };
  }, [forceUpdate]);

  return {
    data: sData,
    loading: sLoading,
    error: sError,
    authenticated: sAuthenticated,
  };
}

/** Compact 12,480 → "12,480" / 1,234,567 → "1.2M" formatter for the HUD. */
export function formatResource(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}K`;
  return Number(n).toLocaleString('tr-TR');
}
