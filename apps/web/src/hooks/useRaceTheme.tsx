'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type RaceId = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';

interface RaceInfo {
  id: RaceId;
  name: string;
  color: string;
  dim: string;
  glow: string;
  portraitHero: string;
  portraitVillain: string;
}

const RACES: Record<RaceId, RaceInfo> = {
  insan:   { id: 'insan',   name: 'İnsan',   color: '#4a9eff', dim: 'rgba(74,158,255,0.10)',  glow: 'rgba(74,158,255,0.30)',  portraitHero: '/assets/characters/insan/voss.png',       portraitVillain: '/assets/characters/seytan/malphas.png' },
  zerg:    { id: 'zerg',    name: 'Zerg',     color: '#44ff44', dim: 'rgba(68,255,68,0.10)',   glow: 'rgba(68,255,68,0.30)',   portraitHero: '/assets/characters/zerg/zara.png',        portraitVillain: '/assets/characters/seytan/malphas.png' },
  otomat:  { id: 'otomat',  name: 'Otomat',   color: '#00cfff', dim: 'rgba(0,207,255,0.10)',   glow: 'rgba(0,207,255,0.30)',   portraitHero: '/assets/characters/otomat/aurelius.png',  portraitVillain: '/assets/characters/seytan/malphas.png' },
  canavar: { id: 'canavar', name: 'Canavar',  color: '#ff6600', dim: 'rgba(255,102,0,0.10)',   glow: 'rgba(255,102,0,0.30)',   portraitHero: '/assets/characters/canavar/khorvash.png', portraitVillain: '/assets/characters/seytan/malphas.png' },
  seytan:  { id: 'seytan',  name: 'Şeytan',   color: '#cc00ff', dim: 'rgba(204,0,255,0.10)',   glow: 'rgba(204,0,255,0.30)',   portraitHero: '/assets/characters/seytan/malphas.png',   portraitVillain: '/assets/characters/seytan/lilithra.png' },
};

interface RaceThemeContext {
  race: RaceId;
  raceInfo: RaceInfo;
  setRace: (race: RaceId) => void;
}

const RaceThemeCtx = createContext<RaceThemeContext>({
  race: 'insan',
  raceInfo: RACES.insan,
  setRace: () => {},
});

export function RaceThemeProvider({ children }: { children: ReactNode }) {
  const [race, setRaceState] = useState<RaceId>('insan');

  const setRace = useCallback((r: RaceId) => {
    setRaceState(r);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-race', r);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-race', race);
  }, [race]);

  return (
    <RaceThemeCtx.Provider value={{ race, raceInfo: RACES[race], setRace }}>
      {children}
    </RaceThemeCtx.Provider>
  );
}

export function useRaceTheme() {
  return useContext(RaceThemeCtx);
}
