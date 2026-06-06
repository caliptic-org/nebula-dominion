'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ScrTutorialAttack,
  ScrTutorialBuild,
  ScrTutorialComplete,
  ScrTutorialProduce,
  ScrTutorialTierUp,
  ScrTutorialWelcome,
  TUTORIAL_STEPS,
  toast,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Analytics, track } from '@/lib/analytics';
import { gameServerApi } from '@/lib/game-server-api';
import { refreshGameResources } from '@/hooks/useGameResources';
import { hasSession } from '@/lib/session';
import { api, FetchError } from '@/lib/api';

const STORAGE_KEY = 'nebula:tutorial:v1';

/**
 * Backend stepId(s) for each of the 6 UI tutorial screens.
 *
 * The backend (apps/api/src/modules/onboarding/onboarding.config.ts) defines
 * 10 named steps in a strict linear order. The UI shows 6 condensed screens.
 * Each UI advance reports completion for the matching backend step(s) so the
 * api's TutorialProgress row flips `isCompleted = true` only after every
 * backend step has been logged. game-server's tutorial-complete handler
 * reads that flag before granting the starter gift, which closes the URL-
 * jump exploit (`/tutorial?step=6` → Advance → harvest).
 *
 * IMPORTANT: by the time the UI reaches /tutorial?step=1, the user has
 * already completed `welcome` + `race_selection` server-side. That happens
 * inside UserService.selectRace, which calls
 * onboardingService.completeStep({stepId:'race_selection'}) immediately
 * after persisting `user.race`. The backend's `currentStep` is therefore
 * `base_overview` (not `welcome`) before the player ever taps Advance on
 * the first tutorial screen. (Audit blocker F1, 2026-06-06 — old map
 * pointed step 1 → `welcome`, which 400'd as both backward and already-
 * completed and trapped fresh accounts.)
 *
 * onboarding.service.ts enforces a strict `targetIdx <= currentIdx + 1`
 * rule (F-CYCLE3-02 anti-exploit fix) — no fast-forwarding past more than
 * one step. So when a single UI screen needs to cover multiple backend
 * steps, we POST them sequentially, one per call. Mapping is an array
 * of stepIds in the order they should be reported.
 *
 * Mapping covers all 8 remaining backend steps across 6 UI screens:
 *   screen 1: base_overview              (1)
 *   screen 2: first_building             (1)
 *   screen 3: resource_collection        (1)
 *   screen 4: first_unit, combat_basics, first_pve_battle (3 — combat arc)
 *   screen 5: progression_intro          (1)
 *   screen 6: tutorial_complete          (1)
 */
const UI_STEP_TO_BACKEND_STEP_IDS: Record<number, string[]> = {
  1: ['base_overview'], // tutorial_step_1 — welcome+race already done server-side
  2: ['first_building'], // tutorial_step_2
  3: ['resource_collection'], // tutorial_step_3
  4: ['first_unit', 'combat_basics', 'first_pve_battle'], // tutorial_step_4 (combat arc)
  5: ['progression_intro'], // tutorial_step_5
  6: ['tutorial_complete'], // tutorial_step_6
};

interface TutorialProgress {
  stepIndex: number;
  completedAt: string | null;
}

const DEFAULT_PROGRESS: TutorialProgress = { stepIndex: 1, completedAt: null };

function readProgress(): TutorialProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<TutorialProgress>;
    return { ...DEFAULT_PROGRESS, ...parsed };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function writeProgress(next: TutorialProgress) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* non-critical */
  }
}

function clampStep(step: number): number {
  if (Number.isNaN(step)) return 1;
  if (step < 1) return 1;
  if (step > TUTORIAL_STEPS) return TUTORIAL_STEPS;
  return step;
}

function TutorialFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const race = useNDRace();
  const tTutorial = useTranslations('tutorial');
  const { markTutorialCompleted, markIntroSeen } = useOnboarding();

  const step = useMemo(() => {
    const raw = Number(params.get('step') ?? '1');
    return clampStep(raw);
  }, [params]);

  // Persist current step every time the URL changes — keeps localStorage in
  // sync with what the player has actually seen, so a reload resumes here.
  useEffect(() => {
    const prev = readProgress();
    if (prev.stepIndex !== step) {
      writeProgress({ stepIndex: step, completedAt: prev.completedAt });
    }
  }, [step]);

  const go = useCallback(
    (next: number) => {
      const target = clampStep(next);
      const search = new URLSearchParams(params.toString());
      search.set('step', String(target));
      router.replace(`/tutorial?${search.toString()}`);
    },
    [params, router],
  );

  const handleAdvance = useCallback(async () => {
    // Before advancing past the current step, record completion on the api
    // side so the game-server tutorial-complete check (which reads the api's
    // TutorialProgress row) can verify the player actually walked through
    // every step. Previously the gate was URL+localStorage only — a player
    // could navigate directly to /tutorial?step=6 and tap Advance to harvest
    // the starter gift. Skipped for guests (no token, no progress row).
    //
    // Path matches apps/api/src/modules/onboarding/onboarding.controller.ts:
    //   POST /api/v1/onboarding/step/complete   {stepId: 'tutorial_step_N'}
    //
    // The api's completeStep enforces the natural step order. If the player
    // jumped ahead, it returns 400 ("Mevcut adım '...', '...' değil") — we
    // surface that as a hint and block the navigation. NotFound (404) for an
    // unknown stepId follows the same path: don't advance, tell the player.
    if (hasSession()) {
      // Some UI screens cover more than one backend step (e.g. screen 4's
      // combat arc bundles `first_unit` + `combat_basics` + `first_pve_battle`).
      // POST them sequentially — the api's strict targetIdx <= currentIdx+1
      // rule rejects multi-step jumps. The api's idempotency safety net
      // also means a retry of an already-completed step is a 200 no-op.
      const backendStepIds = UI_STEP_TO_BACKEND_STEP_IDS[step] ?? [];
      for (const backendStepId of backendStepIds) {
        try {
          await api.post('/onboarding/step/complete', {
            stepId: backendStepId,
          });
        } catch (err) {
          if (err instanceof FetchError && (err.status === 400 || err.status === 404)) {
            // Out-of-order step or unknown stepId — don't move forward, surface
            // the api's translated message so the player understands.
            toast.info(err.message || tTutorial('stepBlocked'));
            return;
          }
          // 401 already triggers a global redirect via api.ts. Other transport
          // errors shouldn't trap the player — log via toast and let them keep
          // going so a flaky network doesn't permanently lock the tutorial.
          toast.info(tTutorial('stepSyncFailed'));
          // Break out of the loop so we don't pile up errors; advance anyway.
          break;
        }
      }
    }

    if (step >= TUTORIAL_STEPS) {
      writeProgress({ stepIndex: TUTORIAL_STEPS, completedAt: new Date().toISOString() });
      markTutorialCompleted();
      Analytics.tutorialComplete();
      // Claim the "BAŞLANGIÇ HEDİYESİ" the final tutorial card promises.
      // The game-server's POST /players/me/tutorial-complete is idempotent
      // (per-userId in-memory flag), so a back-button revisit + re-finish
      // doesn't double-grant. Skipped for guests — they never had an
      // authenticated session to grant against.
      if (hasSession()) {
        try {
          await gameServerApi.post('/players/me/tutorial-complete');
          toast.success(tTutorial('giftClaimed'));
          refreshGameResources();
        } catch (err) {
          // "Already redeemed" is the most common path — silently swallow.
          // Other errors get a small toast so the player isn't blocked from
          // landing on /base.
          if (err instanceof FetchError && err.status !== 400) {
            toast.info(tTutorial('giftFailed'));
          }
        }
      }
      router.replace('/base');
      return;
    }
    // Step-level funnel: fires for every "next" tap. Drop-off chart reveals
    // which step is the friction point.
    Analytics.tutorialStep(step);
    go(step + 1);
  }, [step, go, markTutorialCompleted, router, tTutorial]);

  const handleSkip = useCallback(() => {
    writeProgress({ stepIndex: TUTORIAL_STEPS, completedAt: new Date().toISOString() });
    markIntroSeen();
    markTutorialCompleted();
    // Emit a distinct event for skip — completion-rate cohort needs to
    // separate "finished" from "fast-forwarded" players.
    track('tutorial_skip', { step });
    router.replace('/base');
  }, [step, markIntroSeen, markTutorialCompleted, router]);

  switch (step) {
    case 1:
      return <ScrTutorialWelcome race={race} onSkip={handleSkip} onAdvance={handleAdvance} />;
    case 2:
      return <ScrTutorialBuild race={race} onSkip={handleSkip} onAdvance={handleAdvance} />;
    case 3:
      return <ScrTutorialProduce race={race} onSkip={handleSkip} onAdvance={handleAdvance} />;
    case 4:
      return <ScrTutorialAttack race={race} onSkip={handleSkip} onAdvance={handleAdvance} />;
    case 5:
      return <ScrTutorialTierUp race={race} onSkip={handleSkip} onAdvance={handleAdvance} />;
    case 6:
    default:
      return <ScrTutorialComplete race={race} onSkip={handleSkip} onAdvance={handleAdvance} />;
  }
}

export default function TutorialPage() {
  return (
    <Suspense fallback={null}>
      <TutorialFlow />
    </Suspense>
  );
}
