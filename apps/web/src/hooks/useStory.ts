'use client';

import { useEffect, useState } from 'react';
import type { NDRaceKey } from '@/components/handoff/nd-tokens';
import { track } from '@/lib/analytics';

/* Race-aware story client.
 *
 * Fetches the 6-chapter arc for the given race from /api/v1/story/chapters?race=<key>.
 * Falls back gracefully on network failure so the cinematic scene still has
 * something to render — the consumer (ScrStoryScene) handles that via its own
 * `acts` defaults derived from RACES[*].storyAct1/2.
 *
 * Wire-up matches the rest of the app: base URL comes from
 * NEXT_PUBLIC_API_URL (default http://localhost:4000) with `/api/v1` appended.
 */

export interface StoryChapterDto {
  id: string;
  number: number;
  title: string;
  age: number;
  levelRequirement: number;
  race: NDRaceKey | null;
  summary: string;
  narrative: string;
  choices?: { id: string; text: string; outcome: string }[];
  reward: { gold?: number; gems?: number; xp?: number; titleUnlock?: string };
  bossEncounterCode?: string;
  nextChapterId: string | null;
}

interface UseStoryResult {
  chapters: StoryChapterDto[];
  loading: boolean;
  error: string | null;
}

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '') + '/api/v1';

export function useStory(race: NDRaceKey | null): UseStoryResult {
  const [chapters, setChapters] = useState<StoryChapterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!race) {
      setChapters([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/story/chapters?race=${encodeURIComponent(race)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as StoryChapterDto[];
        if (!cancelled) {
          setChapters(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setChapters([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [race]);

  return { chapters, loading, error };
}

/* Result of the story-complete pipeline.
 *
 * ## Cycle 13 BE pipeline (recap)
 * `POST /story/progress/me/complete/:chapterId` runs:
 *   1. **Level gate** — `player_levels.current_level >= chapter.levelRequirement`
 *      → 400 "Çağ X gerekiyor (şu an Lv Y)".
 *   2. **Linear-order gate** — chapterId must equal the story_progress
 *      row's `current_chapter` pointer → 400 "Önce 'ch_XX_…' bölümünü
 *      tamamlamalısın".
 *   3. **Duplicate guard** under a `pessimistic_write` tx → 400 "Bölüm
 *      'ch_XX_…' zaten tamamlandı".
 *   4. **Reward delivery** in the same tx — `user_currency` upsert
 *      (gold/gems), `user_titles` insert for `titleUnlock`. XP fan-out
 *      goes to game-server's `ProgressionService.awardXp` AFTER commit
 *      using the caller's bearer token.
 *
 * ## Cycle 14 FE callers (this hook)
 * - `ScrStoryScene` cinematic — calls `completeStoryChapter(chapterId)`
 *   from its `onComplete` handler after the player reaches the final
 *   act and taps "BİTİR".
 * - `ScrStoryGallery` viewer — adds a "TAMAMLA" CTA in `ActViewer` that
 *   calls the same hook for the player's race acts.
 * - Both consumers funnel through the canonical caller below so the
 *   in-flight Set guard prevents double-POST when the cinematic + the
 *   gallery are both open (e.g. user opened gallery in a second tab).
 *
 * Audit cycle 6 (STORY-COMPLETE-NO-ORDER-GATE) added the BE gates;
 * cycle 13 (STORY-NO-REWARD-DELIVERY) wired the wallet/title pipeline;
 * cycle 14 (this) wires the FE callers — before, the cycle 13 BE
 * rewrite was dead code because no FE path ever POSTed to it. */
export interface MarkStorySeenResult {
  ok: boolean;
  /** Translated BE error message (already in TR) when ok=false and the
   *  failure came from the server. Empty for guest no-ops and network
   *  errors (handled separately to avoid leaking SDK strings to UI). */
  error: string | null;
  /** HTTP status when ok=false. Lets callers distinguish a "guest, no
   *  token" no-op (status=0) from a real BE block (400) from a network
   *  hiccup (status=0 + error set). 401 → caller should redirect to login. */
  status: number;
  /** Reward payload returned by the BE on a successful complete. Used
   *  by `ScrStoryScene` / `ScrStoryGallery` to render the post-complete
   *  toast ("X gold, Y gems, Z XP, [title unlocked]"). null on failure
   *  and on the legacy `/story/seen` path (which doesn't return rewards). */
  reward: {
    gold?: number;
    gems?: number;
    xp?: number;
    titleUnlock?: string;
  } | null;
  /** Granted title id when the chapter's `titleUnlock` resolved to a
   *  fresh row in `user_titles`. null when the title was already owned
   *  or the chapter has no titleUnlock. */
  titleGranted: string | null;
}

/** Module-level set of chapterIds currently mid-POST. The cinematic
 *  scene and the gallery viewer can both wire `onComplete` for the same
 *  chapter — without this guard, a fast double-tap (or a stale React
 *  effect re-firing on a re-render) would land two POSTs at the BE,
 *  one of which would 400 on the duplicate guard. The set is cleared
 *  in `finally` so a 4xx-rejected attempt can be re-tried after the
 *  player sees the error (e.g. levels up and tries again). */
const inFlightChapterIds = new Set<string>();

/* Canonical caller for the cycle 13 BE pipeline.
 * POST /api/v1/story/progress/me/complete/:chapterId.
 *
 * Returns a `MarkStorySeenResult` with the BE-returned `reward` and
 * `titleGranted` so callers can render the success toast. On a 400
 * the BE error hint is surfaced verbatim (already TR). On a 401 the
 * caller should redirect to /login (the api.ts client will do this
 * automatically when going through the `api` helper; this hook uses
 * `fetch` directly to keep the guest no-op path cheap, so callers
 * must check `result.status === 401` themselves).
 *
 * Idempotent across concurrent callers: a second invocation for the
 * same chapterId while the first is in flight returns a sentinel
 * `{ ok: false, error: null, status: 0 }` instead of double-POSTing. */
export async function completeStoryChapter(
  chapterId: string,
  choiceId?: string,
): Promise<MarkStorySeenResult> {
  if (typeof window === 'undefined') {
    return { ok: false, error: null, status: 0, reward: null, titleGranted: null };
  }
  if (inFlightChapterIds.has(chapterId)) {
    // Concurrent caller — silent no-op. The other caller will surface
    // the result to its own UI; we don't have a way to plumb that
    // through here, but the dedup is the important part.
    return { ok: false, error: null, status: 0, reward: null, titleGranted: null };
  }
  track('story_chapter_view', { scene_id: chapterId, choice_id: choiceId });
  const token = window.localStorage.getItem('accessToken');
  if (!token) {
    // Guest no-op — not an error worth toasting.
    return { ok: false, error: null, status: 0, reward: null, titleGranted: null };
  }
  inFlightChapterIds.add(chapterId);
  try {
    const res = await fetch(
      `${API_BASE}/story/progress/me/complete/${encodeURIComponent(chapterId)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(choiceId ? { choiceId } : {}),
      },
    );
    if (res.ok) {
      if (choiceId) {
        track('story_choice', { scene_id: chapterId, choice_id: choiceId });
      }
      let reward: MarkStorySeenResult['reward'] = null;
      let titleGranted: string | null = null;
      try {
        const body = (await res.json()) as {
          reward?: MarkStorySeenResult['reward'];
          titleGranted?: string | null;
        };
        reward = body?.reward ?? null;
        titleGranted = body?.titleGranted ?? null;
      } catch {
        // Body parse failure — the BE side persisted fine, the FE just
        // can't render the toast detail. Surface ok=true anyway.
      }
      return { ok: true, error: null, status: res.status, reward, titleGranted };
    }
    let message: string | null = null;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body?.message)) {
        message = body.message.join(' ');
      } else if (typeof body?.message === 'string') {
        message = body.message;
      }
    } catch {
      message = null;
    }
    return {
      ok: false,
      error: message ?? `HTTP ${res.status}`,
      status: res.status,
      reward: null,
      titleGranted: null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      status: 0,
      reward: null,
      titleGranted: null,
    };
  } finally {
    inFlightChapterIds.delete(chapterId);
  }
}

/* Mark a chapter / scene as seen.
 *
 * Cycle 14: this used to POST /api/v1/story/seen (a thinner alias the
 * BE still serves for back-compat) but the reward delivery rewrite
 * landed on `/progress/me/complete/:chapterId`. To keep a single
 * source of truth (and reuse the in-flight guard), `markStorySeen` now
 * delegates to `completeStoryChapter`. Existing callers get the same
 * `MarkStorySeenResult` shape — the only behavioural difference is
 * that the `reward` / `titleGranted` fields are now populated, so the
 * caller can show a richer post-complete toast if it wants. */
export async function markStorySeen(
  sceneId: string,
  choiceId?: string,
): Promise<MarkStorySeenResult> {
  return completeStoryChapter(sceneId, choiceId);
}

/** Build the post-complete toast string from a `MarkStorySeenResult`.
 *  Used by both `ScrStoryScene` and `ScrStoryGallery` so the success
 *  copy stays consistent. Returns null when there's nothing worth
 *  surfacing (no reward, no title) — caller can fall back to a generic
 *  "Bölüm tamamlandı" line. */
export function formatStoryRewardToast(result: MarkStorySeenResult): string | null {
  if (!result.ok) return null;
  const parts: string[] = [];
  const r = result.reward;
  if (r?.gold && r.gold > 0) parts.push(`${r.gold} altın`);
  if (r?.gems && r.gems > 0) parts.push(`${r.gems} elmas`);
  if (r?.xp && r.xp > 0) parts.push(`${r.xp} XP`);
  if (result.titleGranted) parts.push(`unvan açıldı: ${result.titleGranted}`);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}
