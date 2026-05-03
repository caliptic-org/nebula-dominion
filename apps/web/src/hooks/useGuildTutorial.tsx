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
  openOverlay: () => void;
  closeOverlay: () => void;
  advance: (guildIdHint?: string) => Promise<void>;
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadFromStorage();
    setState(loaded);
    setHydrated(true);
    if (loaded.step !== 'completed') {
      setOverlayOpen(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) saveToStorage(state);
  }, [state, hydrated]);

  const openOverlay = useCallback(() => setOverlayOpen(true), []);
  const closeOverlay = useCallback(() => {
    if (state.step === 'completed') setOverlayOpen(false);
  }, [state.step]);

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

        // Idempotency guard: only request the reward if it has not already
        // been granted client-side. The backend MUST also enforce this via
        // tutorial_completed_at — a tampered localStorage value can flip
        // rewardClaimed back to false (see guildApi.grantTutorialReward).
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
    () => ({ state, isOverlayOpen, isAdvancing, openOverlay, closeOverlay, advance, resetForDemo }),
    [state, isOverlayOpen, isAdvancing, openOverlay, closeOverlay, advance, resetForDemo],
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
