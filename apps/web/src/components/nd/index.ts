/* Nebula Dominion — ND foundation barrel.
 *
 * One import surface for every screen built on the Phase-1 foundation:
 *   import { Screen, Frame, Panel, Sigil, H2, RaceThemeProvider } from '@/components/nd';
 */

export { RaceThemeProvider, useNDTheme, useRaceThemeStrict } from './RaceThemeProvider';
export { Sigil } from './Sigil';
export { H1, H2, H3, Caption, Mono, Eyebrow } from './Typography';
export { Screen, Frame, Panel, NeonBorder, RaceChip, Stat } from './Surfaces';
export { ResIcon, ResourceBadge } from './ResourceBadge';

// Token re-exports for convenience — same as `@/lib/nd-tokens` but reachable
// from the ND barrel for self-contained imports.
export { RACES, ND, RACE_KEYS, getRace, isRaceKey } from '@/lib/nd-tokens';
export type {
  RaceKey,
  RaceTheme,
  Resource,
  ResourceIconKind,
  SigilKey,
  RaceUnit,
  RaceBuild,
  RaceCommander,
} from '@/lib/nd-tokens';
