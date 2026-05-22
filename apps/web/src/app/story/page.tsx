'use client';

/**
 * /story — Story Scene (Screen 17)
 *
 * URL params:
 *   ?race=insan|zerg|otomat|canavar|seytan  (override; defaults to committed race)
 *
 * Renders the cinematic narration screen using race tokens (storyAct1/2 from
 * `RACES`). Typewriter is skippable; honours `data-nd-anim="off"` and
 * `prefers-reduced-motion` (text shown immediately).
 */

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RACES,
  ScrStoryScene,
  useNDRace,
  type NDRaceKey,
} from '@/components/handoff';

const RACE_KEYS: NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];

function isRaceKey(value: string | null): value is NDRaceKey {
  return !!value && (RACE_KEYS as readonly string[]).includes(value);
}

function StoryInner() {
  const router = useRouter();
  const params = useSearchParams();
  const committed = useNDRace();
  const overrideKey = params.get('race');
  const race = isRaceKey(overrideKey) ? RACES[overrideKey] : committed;

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return <ScrStoryScene race={race} onComplete={goBack} onExit={goBack} />;
}

export default function StoryPage() {
  return (
    <Suspense fallback={null}>
      <StoryInner />
    </Suspense>
  );
}
