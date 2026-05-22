/* Compatibility shim — canonical tokens now live in `@/lib/nd-tokens`.
 *
 * This file re-exports the same names existing handoff screens import (`NDRace`,
 * `NDRaceKey`, `RACES`, `ND`, ...) so they keep working unchanged.
 */

export {
  RACES,
  ND,
  RACE_KEYS,
  isRaceKey,
  raceKeyFromEnum,
  getRace,
  ndRace,
  type RaceKey,
  type RaceTheme,
  type Resource,
  type ResourceIconKind,
  type SigilKey,
  type RaceUnit,
  type RaceBuild,
  type RaceCommander,
  type NDTokens,
  type NDRaceKey,
  type NDRace,
  type NDResIconKind,
  type NDResource,
  type NDSigilKey,
  type NDRaceUnit,
  type NDRaceBuild,
  type NDRaceCmdr,
} from '@/lib/nd-tokens';
