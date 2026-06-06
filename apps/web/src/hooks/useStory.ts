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

/* Result of POST /api/v1/story/seen.
 *
 * Audit cycle 6 (STORY-COMPLETE-NO-ORDER-GATE) tightened the BE: the
 * server now enforces a linear-order gate, a `player_levels.current_level`
 * level gate, and runs the duplicate guard under a pessimistic-write
 * tx — so the call can now reject with a 400 ("Çağ 3 gerekiyor",
 * "Önce 'ch_05_iron_dawn' bölümünü tamamlamalısın", "Bölüm zaten
 * tamamlandı"). Callers MUST surface `error` to the user when `ok`
 * is false; the previous boolean-only contract dropped the BE message
 * on the floor and made the FE look like it had silently no-op'd on
 * a legitimate progression block. */
export interface MarkStorySeenResult {
  ok: boolean;
  /** Translated BE error message (already in TR) when ok=false and the
   *  failure came from the server. Empty for guest no-ops and network
   *  errors (handled separately to avoid leaking SDK strings to UI). */
  error: string | null;
  /** HTTP status when ok=false. Lets callers distinguish a "guest, no
   *  token" no-op (status=0) from a real BE block (400) from a network
   *  hiccup (status=0 + error set). */
  status: number;
}

/* Mark a chapter / scene as seen. POST /api/v1/story/seen requires a JWT;
 * if the player is a guest, the call no-ops silently. The server records
 * the userId + sceneId pair, enforces linear/level prerequisites, and
 * unlocks the next chapter + persists any `reward.titleUnlock`. On a
 * progression block the BE returns 400 with a Turkish hint; the caller
 * is responsible for surfacing `result.error` to the player. */
export async function markStorySeen(
  sceneId: string,
  choiceId?: string,
): Promise<MarkStorySeenResult> {
  if (typeof window === 'undefined') {
    return { ok: false, error: null, status: 0 };
  }
  // Analytics fires regardless of auth — even guests progress through the
  // story, and we want their funnel data too.
  track('story_chapter_view', { scene_id: sceneId, choice_id: choiceId });
  const token = window.localStorage.getItem('accessToken');
  if (!token) {
    // Guest no-op — not an error worth toasting.
    return { ok: false, error: null, status: 0 };
  }
  try {
    const res = await fetch(`${API_BASE}/story/seen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sceneId, choiceId }),
    });
    if (res.ok) {
      if (choiceId) {
        track('story_choice', { scene_id: sceneId, choice_id: choiceId });
      }
      return { ok: true, error: null, status: res.status };
    }
    // Pull the Nest error envelope ({ message: "..." | string[] }) so we
    // can surface the gate hint directly. Fall back to the HTTP status
    // when the body isn't a recognisable shape.
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
    return { ok: false, error: message ?? `HTTP ${res.status}`, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      status: 0,
    };
  }
}
