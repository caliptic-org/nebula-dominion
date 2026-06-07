import { BuildingType } from './entities/building.entity';

export interface ResourceCost {
  mineral: number;
  gas: number;
  energy: number;
  /** Science points — optional on cost objects, used for grants (battles, node income) */
  science?: number;
}

export interface BuildingProduction {
  mineralPerTick: number;
  gasPerTick: number;
  energyPerTick: number;
  /**
   * Science points produced per tick (optional — defaults to 0 when
   * omitted). Cycle 17 BAL-02: science was previously sourced ONLY from
   * PvP battle rewards + garrisoned galaxy nodes, silently coupling all
   * mid-game BASE upgrades (Lv5+ cost science) to the map/PvP subsystem.
   * Research-flavoured buildings (academy / cyber_core / hatchery) now
   * emit a small science trickle so a pure base-builder can still reach
   * Lv5+ upgrades. Wired into recalculateProductionRates →
   * updateRates(sciencePerTick) → applyTickBulk(science_per_tick).
   */
  sciencePerTick?: number;
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
    // cycle 17 BAL-2 — HQ now has a REAL upgrade cost so age advancement is
    // gated by economy, not just support-building prereqs.
    //
    // Before: cost was { 0, 0, 0 }. Since every upgrade scales the base by
    // EXP^level (BUILDING_UPGRADE_COST_EXP = 1.22, see buildings.service.ts),
    // 0 × anything = 0 — so leveling the HQ from Lv1 → Lv36 (the Çağ 5 gate)
    // cost ZERO resources. The HQ drives the whole tech tier + every age gate
    // yet was economically free, half-defeating the "forces build economy"
    // design. Now the base is { mineral:200, gas:50, energy:100 }; the 1.22
    // exponent back-loads it naturally — early HQ levels are cheap, late
    // ones are a real sink.
    //
    // Tuning anchor (HQ Lv9 = the Çağ 2 gate, targetLevel=9 → scale 1.22^8):
    //   HQ Lv8→Lv9 ≈ 982 M / 245 G / 491 E + 450 science.
    // The prereq rule (upgrade-requirements.ts) requires 2 distinct support
    // buildings at Lv8 to unlock this step. The cost above is ~half the
    // CUMULATIVE outlay of bringing the cheapest 2-support pair from scratch
    // to Lv8 (~1953 M / 354 G / 354 E), and ~2× a single support building's
    // final Lv7→Lv8 upgrade. So the HQ step is a meaningful sink in the same
    // order of magnitude as the prereq investment it gates — not free, not
    // dominant.
    //
    // buildTimeSeconds: the FIRST HQ is pre-seeded at onboarding (see
    // gates.config 'base.build.command_center' → always_on, click = upgrade
    // flow), so the initial-build path never reads this value. The UPGRADE
    // path uses Math.max(buildTimeSeconds, 10) × level for its cooldown;
    // bumped 0 → 20 so HQ upgrades carry a heavier per-level cooldown
    // (20s × level) than a generic building's 10s floor, matching the HQ's
    // strategic weight as the age driver.
    buildTimeSeconds: 20,
    cost: { mineral: 200, gas: 50, energy: 100 },
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
  [BuildingType.ACADEMY]: {
    buildTimeSeconds: 80,
    // Cycle 17 BAL-02: HUMAN research lab — emits a science trickle so
    // base upgrades aren't coupled to PvP-only science sourcing.
    cost: { mineral: 200, gas: 75, energy: 50 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 0, sciencePerTick: 3 },
    energyConsumptionPerTick: 10,
    maxPerPlayer: 2,
    description: 'Trains advanced Human units like Medics and Ghosts. Generates research (science) each tick.',
  },
  [BuildingType.FACTORY]: {
    buildTimeSeconds: 100,
    cost: { mineral: 250, gas: 100, energy: 60 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 0 },
    energyConsumptionPerTick: 12,
    maxPerPlayer: 2,
    description: 'Produces heavy mechanical units such as the Siege Tank.',
  },
  [BuildingType.SPAWNING_POOL]: {
    buildTimeSeconds: 50,
    cost: { mineral: 100, gas: 25, energy: 30 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 0 },
    energyConsumptionPerTick: 6,
    maxPerPlayer: 3,
    description: 'Core Zerg structure for spawning basic combat units.',
  },
  [BuildingType.HATCHERY]: {
    buildTimeSeconds: 70,
    // Cycle 17 BAL-02: ZERG evolution structure doubles as its research
    // lab — science trickle so the Zerg base track also reaches Lv5+.
    cost: { mineral: 175, gas: 50, energy: 40 },
    production: { mineralPerTick: 0, gasPerTick: 5, energyPerTick: 0, sciencePerTick: 3 },
    energyConsumptionPerTick: 8,
    maxPerPlayer: 2,
    description: 'Zerg expansion structure; trains large and elite Zerg units. Generates research (science) each tick.',
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
    // Cycle 17 BAL-02: Automata research core — science trickle so the
    // Age-2 base track is not coupled to PvP-only science sourcing.
    cost: { mineral: 400, gas: 150, energy: 100 },
    production: { mineralPerTick: 0, gasPerTick: 0, energyPerTick: 25, sciencePerTick: 3 },
    energyConsumptionPerTick: 15,
    maxPerPlayer: 1,
    description: 'Gelişmiş Automata komuta merkezi. Yeni birim tiplerini etkinleştirir. Araştırma (bilim) üretir.',
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
