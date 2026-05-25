'use client';

import { useEffect, useState } from 'react';
import { ScrCommanders, type NDRaceKey } from '@/components/handoff';
import { useCommanders } from '@/hooks/useCommanders';

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

export default function CommandersPage() {
  const [playerRaceKey, setPlayerRaceKey] = useState<NDRaceKey>('insan');

  useEffect(() => {
    setPlayerRaceKey(readPlayerRace());
  }, []);

  // Live roster from /api/v1/commanders (meta stub). When the fetch is in
  // flight or the user is a guest, useCommanders returns []; ScrCommanders
  // detects that and falls back to the static RACES catalog so the page
  // never flashes empty. Once data arrives, the user sees their unlocked
  // commanders and the "Komutan Seç" button activates a commander they
  // actually own.
  const { commanders } = useCommanders(playerRaceKey);

  return (
    <ScrCommanders
      playerRaceKey={playerRaceKey}
      liveCommanders={commanders.length > 0 ? commanders : undefined}
    />
  );
}
