'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Race, RACE_DESCRIPTIONS, RaceDescription } from '@/types/units';

interface RaceThemeContext {
  race: Race;
  setRace: (race: Race) => void;
  raceColor: string;
  raceDim: string;
  raceGlow: string;
  meta: RaceDescription;
}

const RaceThemeCtx = createContext<RaceThemeContext>({
  race: Race.INSAN,
  setRace: () => {},
  raceColor: '#4a9eff',
  raceDim: 'rgba(74,158,255,0.10)',
  raceGlow: 'rgba(74,158,255,0.30)',
  meta: RACE_DESCRIPTIONS[Race.INSAN],
});

export function RaceThemeProvider({ children }: { children: ReactNode }) {
  const [race, setRaceState] = useState<Race>(Race.INSAN);

  const setRace = useCallback((r: Race) => {
    setRaceState(r);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-race', RACE_DESCRIPTIONS[r].dataRace);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-race', RACE_DESCRIPTIONS[race].dataRace);
  }, [race]);

  const desc = RACE_DESCRIPTIONS[race];

  return (
    <RaceThemeCtx.Provider value={{
      race,
      setRace,
      raceColor: desc.color,
      raceDim: desc.bgColor,
      raceGlow: desc.glowColor,
      meta: desc,
    }}>
      {children}
    </RaceThemeCtx.Provider>
  );
}

export function useRaceTheme() {
  return useContext(RaceThemeCtx);
}
