'use client';

import { useCallback, useEffect, useReducer } from 'react';
import { api, FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

/**
 * BLOCKER CHAIN-08-A1 fix — api-side premium wallet poll.
 *
 * The shop HUD previously read game-server's `energy` field via
 * useGameResources and rendered it as a 💎 gem balance (default 250).
 * But POST /shop/purchase debits the api-side `user_currency.premium_gems`
 * column (default 0). Two completely different wallets → every fresh
 * account saw a 250-gem HUD, tapped Satın Al, and got
 * "Yetersiz bakiye: premium_gems 0 < 200".
 *
 * This hook polls the REAL wallet GET /api/v1/inventory/wallet so the
 * HUD pill matches what the purchase endpoint will actually debit.
 * useGameResources is still the source of truth for mineral/gas/energy
 * production HUDs — those belong to game-server. Only the shop's
 * currency pill switches to this hook.
 *
 * ## Singleton poll design
 * Mirrors useGameResources: one timer + in-flight guard at module
 * scope; individual consumers register a forceUpdate. Multiple shop
 * pills (HUD + post-purchase refresh + future inventory header) all
 * share the same network request stream.
 *
 * Generation counter mirrors useGameResources so React 18 StrictMode's
 * mount/unmount/remount doesn't multiply parallel poll loops.
 */

export interface UserWalletDto {
  premium_gems: number;
  nebula_coins: number;
  void_crystals: number;
}

interface UseUserWalletResult {
  data: UserWalletDto | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
  refetch: () => Promise<void>;
}

// ── Singleton state ────────────────────────────────────────────────────────
let sData: UserWalletDto | null = null;
let sLoading = true;
let sError: string | null = null;
let sAuthenticated = false;

const sListeners = new Set<() => void>();

let sTimer: ReturnType<typeof setTimeout> | null = null;
let sRunning = false;
let sGeneration = 0;

/** 10 s — slower than useGameResources's 5 s because the premium wallet
 *  changes at human-action rate (one purchase per few seconds at most),
 *  not at the game-server tick rate. Halving the poll keeps the API load
 *  proportional to actual UI need. */
const POLL_MS = 10_000;

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

  sAuthenticated = true;

  try {
    sData = await api.get<UserWalletDto>('/inventory/wallet');
    sError = null;
  } catch (err) {
    // 401 already triggers a redirect in lib/api; here we just surface
    // the message so callers can render an error chip if they want.
    sError = err instanceof FetchError ? err.message : String(err);
  } finally {
    sLoading = false;
    notify();
    if (gen === sGeneration && opts.rearm && sRunning) {
      sTimer = setTimeout(() => void fetchOnce(sGeneration, { rearm: true }), POLL_MS);
    }
  }
}

function startPolling() {
  if (sRunning) return;
  sRunning = true;
  const gen = ++sGeneration;
  void fetchOnce(gen, { rearm: true });
}

function stopPolling() {
  sRunning = false;
  sGeneration++;
  if (sTimer !== null) {
    clearTimeout(sTimer);
    sTimer = null;
  }
  sData = null;
  sLoading = true;
  sError = null;
  sAuthenticated = false;
}

// HMR safety, mirroring useGameResources.
if (typeof window !== 'undefined') {
  const HMR_KEY = '__nebula_user_wallet_stop__';
  const prev = (window as unknown as Record<string, unknown>)[HMR_KEY] as
    | (() => void)
    | undefined;
  if (prev) prev();
  (window as unknown as Record<string, unknown>)[HMR_KEY] = stopPolling;
}

/** Cross-tree refresh — purchase handlers call this after a successful
 *  POST /shop/purchase so the HUD pill updates without waiting for the
 *  10 s tick. */
export const USER_WALLET_REFETCH_EVENT = 'nebula:user-wallet:refetch';

export function refreshUserWallet(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(USER_WALLET_REFETCH_EVENT));
}

export function useUserWallet(): UseUserWalletResult {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    sListeners.add(forceUpdate);
    startPolling();

    const onRefetch = () => void fetchOnce(sGeneration, { rearm: false });
    if (typeof window !== 'undefined') {
      window.addEventListener(USER_WALLET_REFETCH_EVENT, onRefetch);
    }

    return () => {
      sListeners.delete(forceUpdate);
      if (typeof window !== 'undefined') {
        window.removeEventListener(USER_WALLET_REFETCH_EVENT, onRefetch);
      }
      if (sListeners.size === 0) stopPolling();
    };
  }, [forceUpdate]);

  const refetch = useCallback(async () => {
    await fetchOnce(sGeneration, { rearm: false });
  }, []);

  return {
    data: sData,
    loading: sLoading,
    error: sError,
    authenticated: sAuthenticated,
    refetch,
  };
}
