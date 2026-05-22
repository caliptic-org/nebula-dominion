'use client';

import { useEffect, useState } from 'react';
import { ScrCommanders, type NDRaceKey } from '@/components/handoff';

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

  return <ScrCommanders playerRaceKey={playerRaceKey} />;
}
