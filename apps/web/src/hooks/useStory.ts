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

/* Mark a chapter / scene as seen. POST /api/v1/story/seen requires a JWT;
 * if the player is a guest, the call no-ops silently. The server records
 * the userId + sceneId pair and unlocks the next chapter accordingly. */
export async function markStorySeen(sceneId: string, choiceId?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  // Analytics fires regardless of auth — even guests progress through the
  // story, and we want their funnel data too.
  track('story_chapter_view', { scene_id: sceneId, choice_id: choiceId });
  const token = window.localStorage.getItem('accessToken');
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/story/seen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sceneId, choiceId }),
    });
    if (res.ok && choiceId) {
      track('story_choice', { scene_id: sceneId, choice_id: choiceId });
    }
    return res.ok;
  } catch {
    return false;
  }
}
