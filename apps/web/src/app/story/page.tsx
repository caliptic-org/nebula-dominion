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
 *
 * ## Cycle 15: catalog-fetch race fix (DRIFT-14-02)
 *
 * Cycle 14 wired the BE pipeline correctly but `chapterId` was resolved
 * by `chapters.find(c => c.id === param)` against a `useStory` hook
 * whose initial state is `chapters=[]` / `loading=true`. A fast player
 * who landed on `/story?chapter=ch_01_arrival`, skipped both acts with
 * Enter, and tapped BİTİR before the `/story/chapters` GET resolved
 * would have `chapterId` stuck on `undefined` — `ScrStoryScene` then
 * hit its `if (!chapterId)` preview branch and called `onComplete()`
 * with NO BE POST. Cycle 15 closes that race by trusting the URL param
 * directly while the catalog is still in flight; the BE re-validates
 * the id server-side so stale/typo links still get rejected.
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

  /* ## Cycle 15: catalog-fetch race fix (DRIFT-14-02)
   *
   * Cycle 14 wired the BE complete pipeline through `ScrStoryScene` —
   * but the cinematic mounts as soon as `/story?chapter=ch_…` resolves,
   * while `useStory` is still in flight (initial `chapters=[]`,
   * `loading=true`). A fast player who skips both acts with Enter and
   * taps "BİTİR" before the `/api/v1/story/chapters` round-trip
   * completes would land on the `if (!chapterId)` preview branch in
   * `ScrStoryScene.completeAndExit` — which fires `onComplete()` with
   * NO BE POST. Net effect: zero gold, zero gems, zero XP, no title.
   *
   * Fix: trust the URL param directly when the catalog hasn't arrived
   * yet (`chapters.length === 0`). The BE re-validates the id against
   * the catalog server-side and returns a 400 hint if it's bogus
   * (already handled by `completeStoryChapter`'s error path). This
   * avoids blocking the cinematic for the catalog round-trip while
   * still rejecting typo'd / stale links once the list arrives. */
  const chapterId = useMemo(() => {
    if (!chapterIdParam) {
      // No param → preview / gallery embed; let ScrStoryScene skip
      // the network call. The /story-gallery viewer is the authoritative
      // entry for "complete a specific chapter".
      return undefined;
    }
    if (chapters.length === 0) {
      // Catalog still mid-fetch (or fetch failed). Trust the URL —
      // the BE will reject an invalid id with a 400 toast surfaced
      // by completeStoryChapter's error path. This closes the cycle
      // 15 race where a fast Enter+BİTİR before the catalog GET
      // resolved silently exited with zero reward credited.
      return chapterIdParam;
    }
    // Catalog loaded — verify the param resolves to a real chapter
    // for this race; drops typos / stale links to a no-op preview
    // so we don't 400 the user with "Bölüm 'foo' bulunamadı".
    const match = chapters.find((c) => c.id === chapterIdParam);
    return match?.id;
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
