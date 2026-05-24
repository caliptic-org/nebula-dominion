'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useNDRace } from '@/components/handoff/useNDRace';
import { useUserProfile } from './useUserProfile';
import { useGameBuildings } from './useGameBuildings';
import { useGameUnits } from './useGameUnits';
import {
  WIZARD_STEPS,
  resolveStepRoute,
  type WizardContext,
  type WizardStep,
} from '@/lib/wizard-steps';

/**
 * New-player progression wizard — resolves the FIRST incomplete step
 * from the static WIZARD_STEPS list against live server state.
 *
 * Returns:
 *   - step:  the next step the player should take, or null when every
 *            step is done / explicitly dismissed
 *   - route: the resolved URL (race-aware ?focus= already applied)
 *   - dismissStep / dismissAll: opt-out hooks for the UI
 *   - markRouteVisited: call from a router listener to advance the
 *     "you've already been to X" check group
 *
 * State persistence is localStorage-only (no backend call) — the
 * wizard is a UX hint layer, not authoritative progression.
 */

const STORAGE_KEY = 'nebula:wizard:v1';

interface WizardStoredState {
  visitedRoutes: string[];
  dismissed: string[];
  /** When set to true, no chip is shown — full opt-out. */
  hiddenForever: boolean;
}

const DEFAULT_STATE: WizardStoredState = {
  visitedRoutes: [],
  dismissed: [],
  hiddenForever: false,
};

function readStorage(): WizardStoredState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<WizardStoredState>;
    return {
      visitedRoutes: Array.isArray(parsed.visitedRoutes) ? parsed.visitedRoutes : [],
      dismissed: Array.isArray(parsed.dismissed) ? parsed.dismissed : [],
      hiddenForever: Boolean(parsed.hiddenForever),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeStorage(state: WizardStoredState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — non-critical */
  }
}

interface UseWizardStepResult {
  step: WizardStep | null;
  route: string | null;
  loading: boolean;
  hiddenForever: boolean;
  dismissStep: (id: string) => void;
  dismissAll: () => void;
  markRouteVisited: (route: string) => void;
}

export function useWizardStep(): UseWizardStepResult {
  const race = useNDRace();
  const { profile, loading: profileLoading, authenticated } = useUserProfile();
  const { data: buildings, loading: buildingsLoading } = useGameBuildings();
  const { data: units, loading: unitsLoading } = useGameUnits();
  const pathname = usePathname();

  // Local state hydrates from storage on mount to avoid SSR mismatch.
  const [stored, setStored] = useState<WizardStoredState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStored(readStorage());
    setHydrated(true);
  }, []);

  // Auto-mark current route as visited whenever the user navigates.
  // Lets check-by-visit steps (e.g. visit-inventory) clear automatically.
  useEffect(() => {
    if (!hydrated || !pathname) return;
    setStored((prev) => {
      if (prev.visitedRoutes.includes(pathname)) return prev;
      const next = { ...prev, visitedRoutes: [...prev.visitedRoutes, pathname] };
      writeStorage(next);
      return next;
    });
  }, [pathname, hydrated]);

  const dismissStep = (id: string) => {
    setStored((prev) => {
      if (prev.dismissed.includes(id)) return prev;
      const next = { ...prev, dismissed: [...prev.dismissed, id] };
      writeStorage(next);
      return next;
    });
  };

  const dismissAll = () => {
    const next: WizardStoredState = { ...stored, hiddenForever: true };
    writeStorage(next);
    setStored(next);
  };

  const markRouteVisited = (route: string) => {
    setStored((prev) => {
      if (prev.visitedRoutes.includes(route)) return prev;
      const next = { ...prev, visitedRoutes: [...prev.visitedRoutes, route] };
      writeStorage(next);
      return next;
    });
  };

  const loading = profileLoading || buildingsLoading || unitsLoading || !hydrated;

  // Compose the live context and walk WIZARD_STEPS for the first
  // incomplete + non-dismissed step.
  const step = useMemo<WizardStep | null>(() => {
    if (loading || stored.hiddenForever) return null;
    // Guests don't see the wizard until they authenticate. The race-select
    // step itself requires a profile to check `profile.race`, so showing
    // the hint pre-login wouldn't work anyway.
    if (!authenticated) return null;

    const ctx: WizardContext = {
      race,
      profile,
      buildings,
      units,
      hasAlliance: Boolean(profile?.allianceTag),
      visitedRoutes: new Set(stored.visitedRoutes),
      dismissed: new Set(stored.dismissed),
    };

    for (const s of WIZARD_STEPS) {
      if (ctx.dismissed.has(s.id)) continue;
      try {
        if (!s.isDone(ctx)) return s;
      } catch {
        // If a check function throws (e.g. transient null deref while
        // server data loads), skip the step rather than crash the hint.
        continue;
      }
    }
    return null;
  }, [loading, authenticated, stored, race, profile, buildings, units]);

  const route = step ? resolveStepRoute(step, race) : null;

  return {
    step,
    route,
    loading,
    hiddenForever: stored.hiddenForever,
    dismissStep,
    dismissAll,
    markRouteVisited,
  };
}
