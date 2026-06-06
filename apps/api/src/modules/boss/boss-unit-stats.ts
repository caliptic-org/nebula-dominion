import { Race } from '../../user/entities/race.enum';

/**
 * Boss-module-local mirror of game-server's UNIT_CONFIGS + RACE_BONUSES
 * (apps/game-server/src/units/constants/race-configs.constants.ts).
 *
 * Why a mirror and not a shared import:
 *   Per CLAUDE.md §6 the only sanctioned cross-app import path is
 *   `backend/`. The api Nest app deliberately does not depend on
 *   game-server source — formations.service.ts and merge-preview.service.ts
 *   already follow this "duplicate constants by hand" pattern (see
 *   BAS_KOMUTAN_IDS in formations.service.ts).
 *
 * SECURITY ROLE:
 *   This file is the server-side source of truth used by
 *   BossService.startAttempt() to stamp canonical {attack, raceBonus}
 *   onto each deployed-unit row at attempt-start time, replacing the
 *   client-supplied stats that previously powered the boss damage
 *   formula. attackBoss() then reads ONLY from the stamped row.
 *
 * MAINTENANCE:
 *   When game-server's UNIT_CONFIGS or RACE_BONUSES change, mirror the
 *   change here. A drift just means boss damage diverges from PvP
 *   damage — annoying but not exploitable.
 */

export interface UnitBaseStats {
  /** Game-server UnitType enum value (player_units.type column). */
  type: string;
  /** Authoritative attack stat — used as boss damage multiplier. */
  attack: number;
}

/** Base attack values copied from game-server UNIT_CONFIGS.  Only `attack`
 *  is mirrored — boss math doesn't read hp/defense/speed at this layer. */
export const UNIT_ATTACK_BY_TYPE: Record<string, number> = {
  // Human — base catalog
  marine: 10,
  medic: 4,
  siege_tank: 35,
  ghost: 28,
  // Human — merge chain T2..T5
  sniper: 28,
  engineer: 16,
  mecha_walker: 45,
  genetic_warrior: 72,
  captain: 115,
  // Zerg
  zergling: 8,
  hydralisk: 14,
  ultralisk: 40,
  queen: 12,
};

/** Race attackMult copied from game-server RACE_BONUSES.  This is the
 *  number stamped onto deployed-unit rows as `raceBonus` so boss damage
 *  applies the same race multiplier PvP combat does. */
export const RACE_ATTACK_BONUS: Record<Race, number> = {
  [Race.HUMAN]: 1.0,
  [Race.ZERG]: 1.15,
  [Race.AUTOMATON]: 1.1,
  [Race.BEAST]: 1.0,
  [Race.DEMON]: 1.0,
};

/**
 * Resolve the canonical (attack, raceBonus) tuple for a unit row pulled
 * from player_units. Falls back to the row's own stored `attack` column
 * when the type isn't in our mirror (e.g. a freshly-added unit type the
 * api hasn't been redeployed for yet) — the player_units row was
 * already authored by game-server's training service, so its attack is
 * trustworthy as a baseline.
 *
 * raceBonus defaults to 1.0 for unknown races (same rationale: better
 * to under-credit damage than to let a stale catalog block play).
 */
export function resolveUnitStats(row: {
  type: string;
  race: Race | string;
  attack: number;
}): { attack: number; raceBonus: number } {
  const catalogAttack = UNIT_ATTACK_BY_TYPE[row.type];
  const attack = Number.isFinite(catalogAttack) ? catalogAttack : Number(row.attack) || 0;
  const raceKey = row.race as Race;
  const raceBonus = RACE_ATTACK_BONUS[raceKey] ?? 1.0;
  return { attack, raceBonus };
}
