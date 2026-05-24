'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ScrTutorialAttack,
  ScrTutorialBuild,
  ScrTutorialComplete,
  ScrTutorialProduce,
  ScrTutorialTierUp,
  ScrTutorialWelcome,
  TUTORIAL_STEPS,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Analytics, track } from '@/lib/analytics';

const STORAGE_KEY = 'nebula:tutorial:v1';

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

  const handleAdvance = useCallback(() => {
    if (step >= TUTORIAL_STEPS) {
      writeProgress({ stepIndex: TUTORIAL_STEPS, completedAt: new Date().toISOString() });
      markTutorialCompleted();
      Analytics.tutorialComplete();
      router.replace('/base');
      return;
    }
    // Step-level funnel: fires for every "next" tap. Drop-off chart reveals
    // which step is the friction point.
    Analytics.tutorialStep(step);
    go(step + 1);
  }, [step, go, markTutorialCompleted, router]);

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
