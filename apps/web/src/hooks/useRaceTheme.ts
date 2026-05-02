'use client';

import { Race } from '@/types/units';

interface RaceTheme {
  race: Race;
  raceColor: string;
  raceGlow: string;
}

const RACE_COLORS: Partial<Record<Race, { color: string; glow: string }>> = {
  [Race.HUMAN]:     { color: '#4a9eff', glow: 'rgba(74,158,255,0.55)' },
  [Race.ZERG]:      { color: '#44dd44', glow: 'rgba(68,221,68,0.55)' },
  [Race.AUTOMATON]: { color: '#ff8800', glow: 'rgba(255,136,0,0.55)' },
};

const DEFAULT: { color: string; glow: string } = { color: '#4a9eff', glow: 'rgba(74,158,255,0.55)' };

/**
 * Returns the active player's race and the derived display colors
 * used by HUD/world-map chrome. Currently sourced from a default — wire
 * to player profile state once /api/player/profile is available.
 */
export function useRaceTheme(): RaceTheme {
  const race = Race.HUMAN;
  const palette = RACE_COLORS[race] ?? DEFAULT;
  return { race, raceColor: palette.color, raceGlow: palette.glow };
}
