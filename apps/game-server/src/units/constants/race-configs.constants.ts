import { Race } from '../../matchmaking/dto/join-queue.dto';
import { BuildingType } from '../../buildings/entities/building.entity';

export enum UnitType {
  // Human
  MARINE = 'marine',
  MEDIC = 'medic',
  SIEGE_TANK = 'siege_tank',
  GHOST = 'ghost',
  // Zerg
  ZERGLING = 'zergling',
  HYDRALISK = 'hydralisk',
  ULTRALISK = 'ultralisk',
  QUEEN = 'queen',
}

export interface UnitCost {
  mineral: number;
  gas: number;
  energy: number;
}

export interface UnitConfig {
  type: UnitType;
  race: Race;
  hp: number;
  attack: number;
  defense: number;
  /** Tiles per turn */
  speed: number;
  cost: UnitCost;
  trainTimeSeconds: number;
  requiredBuilding: BuildingType;
  abilities: string[];
  description: string;
}

export interface RaceBonus {
  attackMult: number;
  defenseMult: number;
  hpMult: number;
  speedMult: number;
  trainingTimeMult: number;
}

export const RACE_BONUSES: Record<Race, RaceBonus> = {
  [Race.HUMAN]: {
    attackMult: 1.0,
    defenseMult: 1.15,
    hpMult: 1.10,
    speedMult: 1.0,
    trainingTimeMult: 1.0,
  },
  [Race.ZERG]: {
    attackMult: 1.15,
    defenseMult: 0.85,
    hpMult: 0.90,
    speedMult: 1.30,
    trainingTimeMult: 0.75,
  },
  [Race.AUTOMATON]: {
    attackMult: 1.10,
    defenseMult: 1.20,
    hpMult: 1.0,
    speedMult: 0.90,
    trainingTimeMult: 1.10,
  },
};

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  // ─── Human Units ────────────────────────────────────────────────────────────
  [UnitType.MARINE]: {
    type: UnitType.MARINE,
    race: Race.HUMAN,
    hp: 45,
    attack: 10,
    defense: 6,
    speed: 3,
    cost: { mineral: 50, gas: 0, energy: 10 },
    trainTimeSeconds: 20,
    requiredBuilding: BuildingType.BARRACKS,
    abilities: ['stimpack'],
    description: 'Balanced infantry unit. Stimpack temporarily boosts attack speed.',
  },
  [UnitType.MEDIC]: {
    type: UnitType.MEDIC,
    race: Race.HUMAN,
    hp: 30,
    attack: 4,
    defense: 4,
    speed: 3,
    cost: { mineral: 50, gas: 25, energy: 15 },
    trainTimeSeconds: 25,
    requiredBuilding: BuildingType.ACADEMY,
    abilities: ['heal', 'restoration'],
    description: 'Support unit that heals friendly biological units each turn.',
  },
  [UnitType.SIEGE_TANK]: {
    type: UnitType.SIEGE_TANK,
    race: Race.HUMAN,
    hp: 150,
    attack: 35,
    defense: 12,
    speed: 1,
    cost: { mineral: 150, gas: 100, energy: 40 },
    trainTimeSeconds: 60,
    requiredBuilding: BuildingType.FACTORY,
    abilities: ['siege_mode', 'tank_fire'],
    description: 'Heavy artillery. Slow but devastating in siege mode; cannot move while deployed.',
  },
  [UnitType.GHOST]: {
    type: UnitType.GHOST,
    race: Race.HUMAN,
    hp: 25,
    attack: 28,
    defense: 3,
    speed: 3,
    cost: { mineral: 100, gas: 75, energy: 50 },
    trainTimeSeconds: 45,
    requiredBuilding: BuildingType.ACADEMY,
    abilities: ['cloak', 'nuclear_strike', 'emp_round'],
    description: 'Covert operative with high damage and cloaking. Fragile but lethal.',
  },

  // ─── Zerg Units ─────────────────────────────────────────────────────────────
  [UnitType.ZERGLING]: {
    type: UnitType.ZERGLING,
    race: Race.ZERG,
    hp: 35,
    attack: 8,
    defense: 3,
    speed: 5,
    cost: { mineral: 25, gas: 0, energy: 5 },
    trainTimeSeconds: 15,
    requiredBuilding: BuildingType.SPAWNING_POOL,
    abilities: ['adrenal_glands'],
    description: 'Cheap and fast melee swarm unit. Spawns in pairs for resource efficiency.',
  },
  [UnitType.HYDRALISK]: {
    type: UnitType.HYDRALISK,
    race: Race.ZERG,
    hp: 80,
    attack: 14,
    defense: 5,
    speed: 3,
    cost: { mineral: 75, gas: 25, energy: 20 },
    trainTimeSeconds: 30,
    requiredBuilding: BuildingType.SPAWNING_POOL,
    abilities: ['needle_spine', 'ranged_attack'],
    description: 'Ranged combat unit. Versatile against both ground and air targets.',
  },
  [UnitType.ULTRALISK]: {
    type: UnitType.ULTRALISK,
    race: Race.ZERG,
    hp: 400,
    attack: 40,
    defense: 10,
    speed: 2,
    cost: { mineral: 200, gas: 150, energy: 80 },
    trainTimeSeconds: 75,
    requiredBuilding: BuildingType.HATCHERY,
    abilities: ['rampage', 'chitinous_plating'],
    description: 'Massive armored behemoth. Devastates structures and grouped enemies.',
  },
  [UnitType.QUEEN]: {
    type: UnitType.QUEEN,
    race: Race.ZERG,
    hp: 175,
    attack: 12,
    defense: 7,
    speed: 2,
    cost: { mineral: 100, gas: 100, energy: 50 },
    trainTimeSeconds: 50,
    requiredBuilding: BuildingType.HATCHERY,
    abilities: ['spawn_larvae', 'transfusion', 'creep_tumor'],
    description: 'Hive support unit. Spawns additional larvae and heals biological allies.',
  },
};

/** Returns UNIT_CONFIGS for a given race only */
export function getUnitConfigsByRace(race: Race): UnitConfig[] {
  return Object.values(UNIT_CONFIGS).filter((cfg) => cfg.race === race);
}

/**
 * Applies the race-specific multipliers to a unit config's base stats.
 * Returns a new object; does not mutate the original.
 */
export function applyRaceBonuses(cfg: UnitConfig): UnitConfig & { effectiveStats: { hp: number; attack: number; defense: number; speed: number; trainTimeSeconds: number } } {
  const bonus = RACE_BONUSES[cfg.race];
  return {
    ...cfg,
    effectiveStats: {
      hp: Math.round(cfg.hp * bonus.hpMult),
      attack: Math.round(cfg.attack * bonus.attackMult),
      defense: Math.round(cfg.defense * bonus.defenseMult),
      speed: Math.round(cfg.speed * bonus.speedMult * 10) / 10,
      trainTimeSeconds: Math.round(cfg.trainTimeSeconds * bonus.trainingTimeMult),
    },
  };
}
