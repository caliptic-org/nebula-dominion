'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { TutorialState, TutorialStep } from '@/types/guild';
import { guildApi } from '@/lib/guildApi';

const STORAGE_KEY = 'nebula:guildTutorial';

const INITIAL_STATE: TutorialState = {
  step: 'not_started',
  guildId: null,
  rewardClaimed: false,
  startedAt: null,
  completedAt: null,
};

interface TutorialContextValue {
  state: TutorialState;
  isOverlayOpen: boolean;
  isAdvancing: boolean;
  isHydrating: boolean;
  tutorialRequired: boolean;
  openOverlay: () => void;
  closeOverlay: () => void;
  advance: (guildIdHint?: string) => Promise<void>;
  syncFromBackend: () => Promise<void>;
  resetForDemo: () => void;
}

const TutorialCtx = createContext<TutorialContextValue | null>(null);

const ALL_STEPS: TutorialStep[] = [
  'not_started',
  'guild_chosen',
  'first_donation',
  'first_quest',
  'completed',
];

const loadFromStorage = (): TutorialState => {
  if (typeof window === 'undefined') return INITIAL_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<TutorialState>;
    if (!parsed.step || !ALL_STEPS.includes(parsed.step)) return INITIAL_STATE;
    return { ...INITIAL_STATE, ...parsed };
  } catch {
    return INITIAL_STATE;
  }
};

const saveToStorage = (state: TutorialState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors — tutorial state is non-critical
  }
};

export function GuildTutorialProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TutorialState>(INITIAL_STATE);
  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [isAdvancing, setAdvancing] = useState(false);
  const [isHydrating, setHydrating] = useState(true);
  const [tutorialRequired, setTutorialRequired] = useState(true);

  // Sync local cache + backend on mount. Backend is authoritative — local
  // cache is only used to render an immediate UI before the network roundtrip
  // completes and to remember the guildId hint between page navigations.
  const syncFromBackend = useCallback(async () => {
    try {
      const remote = await guildApi.getTutorialState();
      setTutorialRequired(remote.tutorialRequired);
      setState((prev) => ({
        ...prev,
        step: remote.step,
        rewardClaimed: remote.rewardGranted || prev.rewardClaimed,
        completedAt: remote.completedAt ?? prev.completedAt,
      }));
      // If state is `guild_chosen` or later, find the user's actual guild so
      // the dashboard can render without the search panel re-appearing.
      if (remote.step !== 'not_started') {
        const m = await guildApi.getMembership();
        if (m) setState((prev) => ({ ...prev, guildId: m.guildId }));
      }
    } catch {
      // Backend unreachable — fall back to local cache (already loaded).
      // Showing the overlay against stale state is fine; backend will reject
      // illegal advance attempts on its side anyway.
    } finally {
      setHydrating(false);
    }
  }, []);

  useEffect(() => {
    const loaded = loadFromStorage();
    setState(loaded);
    syncFromBackend().then(() => {
      setOverlayOpen(loaded.step !== 'completed');
    });
  }, [syncFromBackend]);

  useEffect(() => {
    if (!isHydrating) saveToStorage(state);
  }, [state, isHydrating]);

  const openOverlay = useCallback(() => setOverlayOpen(true), []);
  // Close is allowed at any step. Non-skippability comes from two things
  // outside this function: (1) the overlay re-opens automatically on the
  // next page load when step !== 'completed', and (2) the user can only
  // *advance* state via real guild interactions — donating, joining, etc.
  // — which the backend gates. There is no "skip" CTA.
  const closeOverlay = useCallback(() => setOverlayOpen(false), []);

  const advance = useCallback(
    async (guildIdHint?: string) => {
      if (isAdvancing) return;
      setAdvancing(true);
      try {
        const next = await guildApi.advanceTutorial(state.step);
        let nextState: TutorialState = {
          ...state,
          step: next,
          guildId: guildIdHint ?? state.guildId,
          startedAt: state.startedAt ?? new Date().toISOString(),
        };

        // Reward is server-authoritative + idempotent. Skip the call if we
        // already know it landed (rewardClaimed) — guards against double
        // requests when the user re-clicks during transition. The backend's
        // 409 also gets translated to success in guildApi.grantTutorialReward.
        if (next === 'completed' && !state.rewardClaimed) {
          await guildApi.grantTutorialReward();
          nextState = {
            ...nextState,
            rewardClaimed: true,
            completedAt: new Date().toISOString(),
          };
        } else if (next === 'completed') {
          nextState = {
            ...nextState,
            completedAt: state.completedAt ?? new Date().toISOString(),
          };
        }
        setState(nextState);
      } finally {
        setAdvancing(false);
      }
    },
    [state, isAdvancing],
  );

  const resetForDemo = useCallback(() => {
    if (process.env.NODE_ENV !== 'development') return;
    setState(INITIAL_STATE);
    setOverlayOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      state,
      isOverlayOpen,
      isAdvancing,
      isHydrating,
      tutorialRequired,
      openOverlay,
      closeOverlay,
      advance,
      syncFromBackend,
      resetForDemo,
    }),
    [
      state,
      isOverlayOpen,
      isAdvancing,
      isHydrating,
      tutorialRequired,
      openOverlay,
      closeOverlay,
      advance,
      syncFromBackend,
      resetForDemo,
    ],
  );

  return <TutorialCtx.Provider value={value}>{children}</TutorialCtx.Provider>;
}

export function useGuildTutorial() {
  const ctx = useContext(TutorialCtx);
  if (!ctx) throw new Error('useGuildTutorial must be used inside GuildTutorialProvider');
  return ctx;
}

export const TUTORIAL_STEP_INDEX: Record<TutorialStep, number> = {
  not_started: 0,
  guild_chosen: 1,
  first_donation: 2,
  first_quest: 3,
  completed: 4,
};
