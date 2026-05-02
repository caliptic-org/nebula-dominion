'use client';

import { useEffect, useState } from 'react';

export type RaceKey = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';

export const RACE_META: Record<RaceKey, {
  name: string;
  color: string;
  glowColor: string;
  dimColor: string;
  icon: string;
}> = {
  insan:   { name: 'İnsan',   color: '#4a9eff', glowColor: 'rgba(74,158,255,0.35)',  dimColor: 'rgba(74,158,255,0.12)',  icon: '⚔️' },
  zerg:    { name: 'Zerg',    color: '#44ff44', glowColor: 'rgba(68,255,68,0.35)',   dimColor: 'rgba(68,255,68,0.12)',   icon: '🧬' },
  otomat:  { name: 'Otomat',  color: '#00cfff', glowColor: 'rgba(0,207,255,0.35)',   dimColor: 'rgba(0,207,255,0.12)',   icon: '⚡' },
  canavar: { name: 'Canavar', color: '#ff6600', glowColor: 'rgba(255,102,0,0.35)',   dimColor: 'rgba(255,102,0,0.12)',   icon: '🔥' },
  seytan:  { name: 'Şeytan',  color: '#cc00ff', glowColor: 'rgba(204,0,255,0.35)',   dimColor: 'rgba(204,0,255,0.12)',   icon: '💀' },
};

export function useRaceTheme() {
  const [race, setRace] = useState<RaceKey>('insan');

  useEffect(() => {
    document.documentElement.setAttribute('data-race', race);
    return () => {
      document.documentElement.removeAttribute('data-race');
    };
  }, [race]);

  return { race, setRace, meta: RACE_META[race] };
}
