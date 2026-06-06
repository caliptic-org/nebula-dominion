'use client';

import { useEffect, useMemo, useState } from 'react';
import { ScrStoryGallery, type NDRaceKey } from '@/components/handoff';
import { useStory } from '@/hooks/useStory';

const RACE_KEYS: NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];

function readPlayerRace(): NDRaceKey {
  if (typeof window === 'undefined') return 'insan';
  try {
    const raw = window.localStorage.getItem('nebula:race-commitment:v1');
    if (!raw) return 'insan';
    const parsed = JSON.parse(raw) as { race?: string };
    if (parsed?.race && (RACE_KEYS as readonly string[]).includes(parsed.race)) {
      return parsed.race as NDRaceKey;
    }
  } catch {
    // ignore
  }
  return 'insan';
}

export default function StoryGalleryPage() {
  const [playerRaceKey, setPlayerRaceKey] = useState<NDRaceKey>('insan');

  useEffect(() => {
    setPlayerRaceKey(readPlayerRace());
  }, []);

  /**
   * Cycle 14 (STORY-FE-NEVER-COMPLETES): resolve BE chapter ids for the
   * player's race acts so the gallery viewer can surface a "TAMAMLA" CTA
   * that calls the cycle 13 BE pipeline (POST /story/progress/me/complete/:chapterId).
   *
   * The gallery only maps the FIRST TWO chapters of the player's race
   * (matching the hardcoded `ACTS_PER_RACE=2` constant in ScrStoryGallery).
   * The BE catalog has 6 chapters total but the gallery is a 2-act lore
   * preview — the cinematic /story page is the canonical entry for the
   * full arc.
   */
  const { chapters } = useStory(playerRaceKey);
  const playerActChapterIds = useMemo(
    () => ({
      0: chapters[0]?.id,
      1: chapters[1]?.id,
    }),
    [chapters],
  );

  return (
    <ScrStoryGallery
      playerRaceKey={playerRaceKey}
      playerActChapterIds={playerActChapterIds}
    />
  );
}
