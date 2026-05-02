import { BuildingType } from './entities/building.entity';

export interface ResourceCost {
  mineral: number;
  gas: number;
  energy: number;
}

export interface BuildingProduction {
  mineralPerTick: number;
  gasPerTick: number;
  energyPerTick: number;
}

export interface BuildingConfig {
  buildTimeSeconds: number;
  cost: ResourceCost;
  production: BuildingProduction;
  /** Energy consumed each tick while active */
  energyConsumptionPerTick: number;
  /** Max allowed per player */
  maxPerPlayer: number;
  description: string;
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.COMMAND_CENTER]: {
    buildTimeSeconds: 0,
    cost: { mineral: 0, gas: 0, energy: 0 },
    production: { mineralPerTick: 5, gasPerTick: 0, energyPerTick: 10 },
    energyConsumptionPerTick: 5,
    maxPerPlayer: 1,
    description: 'Main base — provides baseline mineral and energy income.',
  },
  [BuildingType.MINERAL_EXTRACTOR]: {
    buildTimeSeconds: 30,
    cost: { mineral: 50, gas: 0, energy: 20 },
    production: { mineralPerTick: 15, gasPerTick: 0, energyPerTick: 0 },
    energyConsumptionPerTick: 3,
    maxPerPlayer: 5,
    description: 'Extracts minerals from the ground each resource tick.',
  },
  [BuildingType.GAS_REFINERY]: {
    buildTimeSeconds: 45,
    cost: { mineral: 75, gas: 0, energy: 30 },
    production: { mineralPerTick: 0, gasPerTick: 10, energyPerTick: 0 },
    energyConsumptionPerTick: 4,
    maxPerPlayer: 3,
    description: 'Refines gas deposits into usable vespene gas.',
  },
  [BuildingType.SOLAR_PLANT]: {
    buildTimeSeconds: 40,
    cost: { mineral: 60, gas: 20, energy: 0 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 20 },
    energyConsumptionPerTick: 0,
    maxPerPlayer: 4,
    description: 'Generates energy from solar radiation each tick.',
  },
  [BuildingType.BARRACKS]: {
    buildTimeSeconds: 60,
    cost: { mineral: 150, gas: 50, energy: 40 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 0 },
    energyConsumptionPerTick: 8,
    maxPerPlayer: 3,
    description: 'Enables unit training. Consumes energy while active.',
  },
  [BuildingType.TURRET]: {
    buildTimeSeconds: 35,
    cost: { mineral: 100, gas: 25, energy: 20 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 0 },
    energyConsumptionPerTick: 6,
    maxPerPlayer: 6,
    description: 'Defensive structure that attacks incoming enemies.',
  },
  [BuildingType.SHIELD_GENERATOR]: {
    buildTimeSeconds: 55,
    cost: { mineral: 125, gas: 75, energy: 50 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 0 },
    energyConsumptionPerTick: 12,
    maxPerPlayer: 2,
    description: 'Projects a shield that absorbs damage for the base.',
  },
  // Age 2 buildings (Automata)
  [BuildingType.NANO_FORGE]: {
    buildTimeSeconds: 90,
    cost: { mineral: 300, gas: 100, energy: 80 },
    production: { mineralPerTick: 25, gasPerTick: 5, energyPerTick: 0 },
    energyConsumptionPerTick: 10,
    maxPerPlayer: 3,
    description: 'Automata birimleri üretir ve mineral işler. Requires Age 2.',
  },
  [BuildingType.CYBER_CORE]: {
    buildTimeSeconds: 120,
    cost: { mineral: 400, gas: 150, energy: 100 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 25 },
    energyConsumptionPerTick: 15,
    maxPerPlayer: 1,
    description: 'Gelişmiş Automata komuta merkezi. Yeni birim tiplerini etkinleştirir.',
  },
  [BuildingType.QUANTUM_REACTOR]: {
    buildTimeSeconds: 100,
    cost: { mineral: 350, gas: 200, energy: 0 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 50 },
    energyConsumptionPerTick: 0,
    maxPerPlayer: 2,
    description: 'Kuantum enerji reaktörü — yüksek enerji üretimi.',
  },
  [BuildingType.DEFENSE_MATRIX]: {
    buildTimeSeconds: 80,
    cost: { mineral: 250, gas: 100, energy: 60 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 0 },
    energyConsumptionPerTick: 20,
    maxPerPlayer: 2,
    description: 'Alan savunma sistemi — çevre birimlerine kalkan sağlar.',
  },
  [BuildingType.REPAIR_DRONE_BAY]: {
    buildTimeSeconds: 75,
    cost: { mineral: 200, gas: 75, energy: 50 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 0 },
    energyConsumptionPerTick: 8,
    maxPerPlayer: 2,
    description: 'Hasar görmüş Automata birimlerini onarır.',
  },
};

/** Convenience: sum of production minus consumption for a single active building */
export function getBuildingNetEnergy(type: BuildingType): number {
  const cfg = BUILDING_CONFIGS[type];
  return cfg.production.energyPerTick - cfg.energyConsumptionPerTick;
}
