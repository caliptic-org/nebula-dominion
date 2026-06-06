import { Race } from '../../user/entities/race.enum';

/**
 * Subspace-module-local mirror of game-server's UNIT_CONFIGS + RACE_BONUSES
 * (apps/game-server/src/units/constants/race-configs.constants.ts).
 *
 * Why a mirror and not a shared import:
 *   Per CLAUDE.md §6 the only sanctioned cross-app import path is
 *   `backend/`. The api Nest app deliberately does not depend on
 *   game-server source — boss/boss-unit-stats.ts already follows this
 *   "duplicate constants by hand" pattern for the same reason.
 *
 * SECURITY ROLE (HIGH ECON-C6-05):
 *   This file is the server-side source of truth used by
 *   SubspaceService.startBattle() to stamp canonical
 *   {type, attack, defense, hp, raceBonus} onto each attackerUnits row at
 *   start-time, replacing the client-supplied stats that previously
 *   powered computeBattleResult(). resolveBattle() then reads ONLY from
 *   the stamped row + a server-derived defender table.
 *
 *   Prior vulnerability: startBattle wrote `dto.attackerUnits` verbatim
 *   (with arbitrary `attack` field), and resolveBattle accepted
 *   `defenderUnits` from the wire. A caller could POST
 *   `{ attackerUnits: [{unitId:<owned>, attack: 99_999_999}],
 *      defenderUnits: [{attack: 0}] }`
 *   into the start+resolve pair and guarantee a victory + rewardsEarned
 *   credit.
 *
 * MAINTENANCE:
 *   When game-server's UNIT_CONFIGS or RACE_BONUSES change, mirror the
 *   change here. A drift just means subspace combat diverges from PvP
 *   combat — annoying but not exploitable.
 */

export interface UnitBaseStats {
  /** Game-server UnitType enum value (player_units.type column). */
  type: string;
  attack: number;
  defense: number;
  hp: number;
}

/** Base stats copied from game-server UNIT_CONFIGS. */
export const UNIT_STATS_BY_TYPE: Record<string, UnitBaseStats> = {
  // Human — base catalog
  marine: { type: 'marine', attack: 10, defense: 6, hp: 45 },
  medic: { type: 'medic', attack: 4, defense: 4, hp: 30 },
  siege_tank: { type: 'siege_tank', attack: 35, defense: 12, hp: 150 },
  ghost: { type: 'ghost', attack: 28, defense: 3, hp: 25 },
  // Human — merge chain T2..T5
  sniper: { type: 'sniper', attack: 28, defense: 6, hp: 96 },
  engineer: { type: 'engineer', attack: 16, defense: 14, hp: 96 },
  mecha_walker: { type: 'mecha_walker', attack: 45, defense: 12, hp: 154 },
  genetic_warrior: { type: 'genetic_warrior', attack: 72, defense: 24, hp: 246 },
  captain: { type: 'captain', attack: 115, defense: 38, hp: 394 },
  // Zerg
  zergling: { type: 'zergling', attack: 8, defense: 3, hp: 35 },
  hydralisk: { type: 'hydralisk', attack: 14, defense: 5, hp: 80 },
  ultralisk: { type: 'ultralisk', attack: 40, defense: 10, hp: 400 },
  queen: { type: 'queen', attack: 12, defense: 7, hp: 175 },
};

export interface RaceBonusFactors {
  attackMult: number;
  defenseMult: number;
  hpMult: number;
}

/** Race attack/defense/hp multipliers copied from game-server RACE_BONUSES. */
export const RACE_BONUSES: Record<Race, RaceBonusFactors> = {
  [Race.HUMAN]: { attackMult: 1.0, defenseMult: 1.15, hpMult: 1.1 },
  [Race.ZERG]: { attackMult: 1.15, defenseMult: 0.85, hpMult: 0.9 },
  [Race.AUTOMATON]: { attackMult: 1.1, defenseMult: 1.2, hpMult: 1.0 },
  [Race.BEAST]: { attackMult: 1.0, defenseMult: 1.0, hpMult: 1.0 },
  [Race.DEMON]: { attackMult: 1.0, defenseMult: 1.0, hpMult: 1.0 },
};

/**
 * Resolve canonical {type, attack, defense, hp, raceBonus} from a
 * player_units row. Falls back to the row's own stored stats when the
 * type isn't in our mirror (e.g. freshly-added unit type the api hasn't
 * been redeployed for yet) — player_units rows are authored by
 * game-server's training service so their stats are trustworthy as a
 * baseline.
 *
 * raceBonus defaults to 1.0 for unknown races (under-credit > block play).
 */
export function resolveSubspaceUnitStats(row: {
  type: string;
  race: Race | string;
  attack: number;
  defense?: number;
  hp?: number;
}): { type: string; attack: number; defense: number; hp: number; raceBonus: number } {
  const catalog = UNIT_STATS_BY_TYPE[row.type];
  const baseAttack = catalog?.attack ?? Number(row.attack) ?? 0;
  const baseDefense = catalog?.defense ?? Number(row.defense) ?? 0;
  const baseHp = catalog?.hp ?? Number(row.hp) ?? 0;
  const raceKey = row.race as Race;
  const bonus = RACE_BONUSES[raceKey] ?? { attackMult: 1.0, defenseMult: 1.0, hpMult: 1.0 };
  return {
    type: row.type,
    attack: Math.max(0, Math.round(baseAttack * bonus.attackMult)),
    defense: Math.max(0, Math.round(baseDefense * bonus.defenseMult)),
    hp: Math.max(0, Math.round(baseHp * bonus.hpMult)),
    raceBonus: bonus.attackMult,
  };
}

/**
 * Zone-seeded PvE defender stats.
 *
 * PvP defenders never reach computeBattleResult — startBattle rejects
 * the PvP battle types. For PvE the defender is a bot scaled off the
 * subspace zone tier; we synthesize the defender roster here so the
 * client doesn't get to nominate it.
 *
 * Power model: per zone, we mint N defender slots each with a fixed
 * attack/defense/hp derived from the tier. Deterministic per zone code
 * so two callers entering the same zone fight the same statline. The
 * actual outcome variance comes from zone modifiers + the attacker's
 * own roster, not RNG on the defender stats.
 */
export const SUBSPACE_DEFENDER_TABLE: Record<
  string,
  { slots: number; attack: number; defense: number; hp: number }
> = {
  alpha: { slots: 4, attack: 60, defense: 20, hp: 200 },
  beta: { slots: 6, attack: 110, defense: 40, hp: 360 },
  gamma: { slots: 8, attack: 200, defense: 70, hp: 640 },
  delta: { slots: 10, attack: 360, defense: 120, hp: 1100 },
  omega: { slots: 12, attack: 620, defense: 200, hp: 1800 },
};

export interface SubspaceDefenderSnapshot {
  /** Synthetic id — not a player_units uuid. */
  slotId: string;
  type: string;
  attack: number;
  defense: number;
  hp: number;
}

/**
 * Mint the defender roster for a PvE subspace battle. Caller-trusted
 * dto.defenderUnits is no longer read; this is the only source.
 */
export function deriveSubspaceDefenders(
  zoneTier: string,
  battleId: string,
): SubspaceDefenderSnapshot[] {
  const seed = SUBSPACE_DEFENDER_TABLE[zoneTier] ??
    SUBSPACE_DEFENDER_TABLE.alpha;
  const out: SubspaceDefenderSnapshot[] = [];
  for (let i = 0; i < seed.slots; i++) {
    out.push({
      slotId: `${battleId}:def:${i}`,
      type: `pve_${zoneTier}_drone`,
      attack: seed.attack,
      defense: seed.defense,
      hp: seed.hp,
    });
  }
  return out;
}
