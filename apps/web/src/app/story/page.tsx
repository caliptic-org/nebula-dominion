'use client';

/**
 * /story — Story Scene (Screen 17)
 *
 * URL params:
 *   ?race=insan|zerg|otomat|canavar|seytan  (override; defaults to committed race)
 *   ?chapter=ch_01_arrival                   (BE chapter id to complete on finish)
 *   ?choice=diplomacy                        (optional choice id; chapter must accept it)
 *
 * Renders the cinematic narration screen using race tokens (storyAct1/2 from
 * `RACES`). Typewriter is skippable; honours `data-nd-anim="off"` and
 * `prefers-reduced-motion` (text shown immediately).
 *
 * ## Cycle 14: BE complete pipeline wired
 *
 * Pre-cycle-14: `onComplete` was `router.back()` only — the cycle 13 BE
 * pipeline (POST /story/progress/me/complete/:chapterId with linear-order
 * + level gates + user_currency upsert + ProgressionService.awardXp + user_titles)
 * was dead code because no FE path POSTed to it. Players read the lore,
 * tapped BİTİR, and walked away with zero gold, zero gems, zero XP, no
 * titles. BE log lines existed for every successful complete in dev runs
 * but production had ZERO successful POSTs.
 *
 * Cycle 14 fix: the `chapter` query param identifies which BE chapter
 * to complete. `ScrStoryScene` calls the canonical hook caller
 * (`completeStoryChapter`) before firing `onComplete`. If the BE
 * resolves the complete pipeline cleanly the player sees a reward toast
 * + wallet HUD refresh; on a 400 the BE gate hint is surfaced; on 401
 * the user is bounced to /login.
 *
 * Falls back to a no-network preview when `?chapter=` is omitted (e.g.
 * the legacy entry from the menu that just wants to show the race lore
 * without crediting anything). That's intentional — we don't want a
 * generic "DEVAM ET" tap to silently credit the user's `current_chapter`.
 */

import { Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RACES,
  ScrStoryScene,
  useNDRace,
  type NDRaceKey,
} from '@/components/handoff';
import { useStory } from '@/hooks/useStory';

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
  // Pull the race-filtered chapter catalog so we can resolve the
  // `?chapter=` param against a real BE id, or fall back to the first
  // chapter for the race when the URL doesn't pin one.
  const { chapters } = useStory(race.key);

  const chapterIdParam = params.get('chapter');
  const choiceIdParam = params.get('choice') ?? undefined;

  const chapterId = useMemo(() => {
    if (chapterIdParam) {
      // Verify the param points at a chapter the BE actually serves
      // for this race — drops typos / stale links to a no-op preview
      // so we don't 404 the user with "Bölüm 'foo' bulunamadı".
      const match = chapters.find((c) => c.id === chapterIdParam);
      if (match) return match.id;
    }
    // No param (or invalid) → leave undefined so ScrStoryScene skips
    // the network call. The /story-gallery viewer is the authoritative
    // entry for "complete a specific chapter".
    return undefined;
  }, [chapterIdParam, chapters]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <ScrStoryScene
      race={race}
      chapterId={chapterId}
      choiceId={choiceIdParam}
      onComplete={goBack}
      onExit={goBack}
    />
  );
}

export default function StoryPage() {
  return (
    <Suspense fallback={null}>
      <StoryInner />
    </Suspense>
  );
}
