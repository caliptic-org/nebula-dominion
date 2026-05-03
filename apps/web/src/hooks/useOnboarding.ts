'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'nebula:onboarding:v1';

export interface OnboardingState {
  hasSeenIntro: boolean;
  hasCompletedTutorial: boolean;
  firstVictoryClaimedAt: string | null;
  lastSessionEndedAt: string | null;
}

const DEFAULT_STATE: OnboardingState = {
  hasSeenIntro: false,
  hasCompletedTutorial: false,
  firstVictoryClaimedAt: null,
  lastSessionEndedAt: null,
};

function readStorage(): OnboardingState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeStorage(state: OnboardingState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or blocked; non-critical.
  }
}

export function useOnboarding() {
  // Hydrate to default first to avoid SSR mismatch, then replace from storage.
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readStorage());
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      writeStorage(next);
      return next;
    });
  }, []);

  const markIntroSeen = useCallback(() => update({ hasSeenIntro: true }), [update]);
  const markTutorialCompleted = useCallback(
    () =>
      update({
        hasCompletedTutorial: true,
        firstVictoryClaimedAt: new Date().toISOString(),
        lastSessionEndedAt: new Date().toISOString(),
      }),
    [update],
  );
  const markSessionEnd = useCallback(
    () => update({ lastSessionEndedAt: new Date().toISOString() }),
    [update],
  );
  const reset = useCallback(() => {
    writeStorage(DEFAULT_STATE);
    setState(DEFAULT_STATE);
  }, []);

  // Show the simplified first-session HUD until the player has either
  // dismissed the cinematic intro or finished the tutorial battle. Skipping
  // is allowed — we don't want to trap a player who is just clicking around
  // a second time before localStorage gets a chance to update.
  const isFirstSession = hydrated && !state.hasSeenIntro && !state.hasCompletedTutorial;

  // "Come back tomorrow" banner: only shown once a player has actually
  // finished their first battle so it ties to a real reward to look forward to.
  const shouldShowNextSessionHook =
    hydrated &&
    state.hasCompletedTutorial &&
    state.firstVictoryClaimedAt !== null;

  return {
    state,
    hydrated,
    isFirstSession,
    shouldShowNextSessionHook,
    markIntroSeen,
    markTutorialCompleted,
    markSessionEnd,
    reset,
  };
}
