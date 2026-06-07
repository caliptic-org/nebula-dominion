import { Race } from '../../matchmaking/dto/join-queue.dto';
import { BuildingType } from '../../buildings/entities/building.entity';

export enum UnitType {
  // Human — original 4 (training catalog)
  MARINE = 'marine',
  MEDIC = 'medic',
  SIEGE_TANK = 'siege_tank',
  GHOST = 'ghost',
  // Human — merge chain (T2..T5, see /merge "Promosyon Töreni"). Cannot be
  // trained directly; only acquired by merging 3× units one tier below in
  // the apps/web/src/lib/nd-tokens.ts insan units lex.
  SNIPER = 'sniper',                 // T2 (merge of 3× Marine)
  ENGINEER = 'engineer',             // T2 (alternative T2)
  MECHA_WALKER = 'mecha_walker',     // T3 (merge of 3× Sniper)
  GENETIC_WARRIOR = 'genetic_warrior', // T4 (merge of 3× Mecha Walker)
  CAPTAIN = 'captain',               // T5 (merge of 3× Genetic Warrior)
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
  /** When false, this unit can only be acquired via /units/merge-roster.
   *  /base/production filters these out so the player can't tap "EĞIT" on
   *  a merge-only result and bounce off a 500. Defaults to true (legacy
   *  units stay trainable without touching every entry). */
  trainable?: boolean;
}

export interface RaceBonus {
  attackMult: number;
  defenseMult: number;
  hpMult: number;
  speedMult: number;
  trainingTimeMult: number;
}

/**
 * cycle 17 BAL-1 — race combat multiplier table.
 *
 * Tuned to pair with the defense-as-reduction damage model in
 * game.service.ts (baseDamage = atk * 100 / (100 + def)). Under that model
 * defense has diminishing returns, so an attack bonus is no longer cancelled
 * out by an opponent's flat defense bonus and no race auto-wins by stacking
 * armour. The prior subtractive formula made HUMAN/AUTOMATON auto-win and
 * ZERG/BEAST/DEMON auto-lose (~5–19x combat-power skew); these values keep
 * each race a sidegrade.
 */
export const RACE_BONUSES: Record<Race, RaceBonus> = {
  // Durable line-holder: best defense + extra HP, no offensive edge.
  [Race.HUMAN]: {
    attackMult: 1.0,
    defenseMult: 1.15,
    hpMult: 1.10,
    speedMult: 1.0,
    trainingTimeMult: 1.0,
  },
  // Swarm aggressor: highest attack + speed, cheapest to mass, but thin
  // armour and no longer a glass cannon. hpMult 0.90→1.0 and defenseMult
  // 0.85→0.95 (cycle 17 BAL-1) so ZERG is a sidegrade rather than paper —
  // the +15% attack now lands real damage through the reduction formula,
  // and the +30% speed feeds the room-creation initiative hook (first
  // strike) instead of being dead weight in a one-action-per-unit turn.
  [Race.ZERG]: {
    attackMult: 1.15,
    defenseMult: 0.95,
    hpMult: 1.0,
    speedMult: 1.30,
    trainingTimeMult: 0.75,
  },
  // Armoured artillery: top defense + solid attack, but slow and slow to
  // build. Diminishing-returns defense keeps it from being unkillable.
  [Race.AUTOMATON]: {
    attackMult: 1.10,
    defenseMult: 1.20,
    hpMult: 1.0,
    speedMult: 0.90,
    trainingTimeMult: 1.10,
  },
  // cycle 17 BAL-1 — BEAST/DEMON moved off the neutral 1.0/1.0/1.0/1.0
  // placeholder (which read as "worst race", a strict subset of everyone
  // else) to distinct-but-balanced identities. They remain whitelist-
  // blocked from PvP queueing (cycle 2 A5) until their full unit kits ship,
  // so these are forward-looking profiles, not yet live-tuned against the
  // 3 shipped races — treat as DEFERRED for fine balance.
  //
  // BEAST — fast, hard-hitting brawler with low armour (a melee bruiser,
  // ZERG-adjacent but trading swarm economy for raw HP bulk).
  [Race.BEAST]: {
    attackMult: 1.20,
    defenseMult: 0.90,
    hpMult: 1.15,
    speedMult: 1.10,
    trainingTimeMult: 1.0,
  },
  // DEMON — high-attack caster/skirmisher: glassy (low HP/def) but hits
  // hardest and trains fast, leaning on burst rather than attrition.
  [Race.DEMON]: {
    attackMult: 1.25,
    defenseMult: 0.85,
    hpMult: 0.90,
    speedMult: 1.05,
    trainingTimeMult: 0.90,
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

  // ─── Human Merge-Chain Units (T2..T5) ───────────────────────────────────────
  // These cannot be trained directly. The `cost` and `trainTimeSeconds` are
  // provided so the entity-level FK relations stay consistent, but the
  // training service rejects them (see PRODUCTION_BUILDINGS guard). The
  // `requiredBuilding` is set to BARRACKS for shape — irrelevant for merge
  // results because the merge endpoint constructs the row directly.
  // Stats follow a +60% per tier ramp from Marine baseline (60 hp / 12 atk /
  // 5 def) so the promotion ladder feels meaningful in combat math.
  [UnitType.SNIPER]: {
    type: UnitType.SNIPER,
    race: Race.HUMAN,
    hp: 96,
    attack: 28,
    defense: 6,
    speed: 2,
    cost: { mineral: 0, gas: 0, energy: 0 },
    trainTimeSeconds: 0,
    requiredBuilding: BuildingType.BARRACKS,
    abilities: ['precision_shot', 'long_range'],
    description: 'Elite marksman promoted from three Marines. Long-range, low cooldown.',
    trainable: false,
  },
  [UnitType.ENGINEER]: {
    type: UnitType.ENGINEER,
    race: Race.HUMAN,
    hp: 96,
    attack: 16,
    defense: 14,
    speed: 2,
    cost: { mineral: 0, gas: 0, energy: 0 },
    trainTimeSeconds: 0,
    requiredBuilding: BuildingType.BARRACKS,
    abilities: ['repair', 'turret_deploy'],
    description: 'Alternative T2 promotion — field engineer with repair + turret support.',
    trainable: false,
  },
  [UnitType.MECHA_WALKER]: {
    type: UnitType.MECHA_WALKER,
    race: Race.HUMAN,
    hp: 154,
    // cycle 17 BAL-4: atk 45 -> 52. Restores a monotone merge curve —
    // 3× Sniper (pw 8064) → 1× Mecha (154×52 = 8008) is now ~x0.99 power
    // (was x0.86, a 15% downgrade). See MERGE_RECIPES JSDoc for the ladder.
    attack: 52,
    defense: 12,
    speed: 2,
    cost: { mineral: 0, gas: 0, energy: 0 },
    trainTimeSeconds: 0,
    requiredBuilding: BuildingType.BARRACKS,
    abilities: ['stomp', 'plasma_cannon'],
    description: 'Pilot-driven mech promoted from three Snipers. Heavy frame, high alpha.',
    trainable: false,
  },
  [UnitType.GENETIC_WARRIOR]: {
    type: UnitType.GENETIC_WARRIOR,
    race: Race.HUMAN,
    hp: 246,
    // cycle 17 BAL-4: atk 72 -> 98. 3× Mecha (pw 24024) → 1× Genetic
    // (246×98 = 24108) is now ~x1.00 power (was x0.85). Keeps the merge
    // ladder monotone non-decreasing in per-merge value.
    attack: 98,
    defense: 24,
    speed: 3,
    cost: { mineral: 0, gas: 0, energy: 0 },
    trainTimeSeconds: 0,
    requiredBuilding: BuildingType.BARRACKS,
    abilities: ['gene_rage', 'regen', 'leap_strike'],
    description: 'Gene-tailored super soldier. Three Mecha Walker pilots fused into one chassis.',
    trainable: false,
  },
  [UnitType.CAPTAIN]: {
    type: UnitType.CAPTAIN,
    race: Race.HUMAN,
    hp: 394,
    // cycle 17 BAL-4: atk 115 -> 184. 3× Genetic (pw 72324) → 1× Captain
    // (394×184 = 72496) is now ~x1.00 power (was x0.85). Captain remains
    // the human merge terminus (no MERGE_RECIPES key → "tepesinde").
    attack: 184,
    defense: 38,
    speed: 3,
    cost: { mineral: 0, gas: 0, energy: 0 },
    trainTimeSeconds: 0,
    requiredBuilding: BuildingType.BARRACKS,
    abilities: ['rally_cry', 'tactical_overlay', 'orbital_strike'],
    description: 'Field captain. Three Genetic Warriors promoted; commands the strike force.',
    trainable: false,
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
  // Exclude merge-only units (trainable=false) so /base/production doesn't
  // render Sniper/Mecha/Genetic/Captain cards that, when tapped, would 500
  // on `invalid enum value training_queue_unit_type_enum: "sniper"` (these
  // were added to player_units_type_enum for merge inserts but never to
  // training_queue's enum, intentionally — they're not trainable).
  return Object.values(UNIT_CONFIGS).filter(
    (cfg) => cfg.race === race && cfg.trainable !== false,
  );
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

/**
 * Base-level "Promosyon Töreni" merge recipes — source type → result type.
 *
 * Mirrors the FE lex tier ladder (apps/web/src/lib/nd-tokens.ts insan
 * units). One row per "3× same type ⇒ 1× next-tier" relationship.  Mixed
 * types (e.g. Marine + Medic + Ghost) aren't in the table — the mergeRoster
 * service enforces same-type-only to keep this concise.
 *
 * Currently insan-only. Other races' merge chains land in follow-up
 * commits once their lex unit types are added to UnitType + UNIT_CONFIGS
 * (and the player_units_type_enum migration extends to cover them).
 *
 * cycle 17 BAL-4 — merge ladder retuned to a monotone power curve
 * (power := hp × attack). Pre-fix the upper merges were a 15% power LOSS
 * per step (3× source pw > result pw). Result-unit attack was bumped
 * (Mecha 45→52, Genetic 72→98, Captain 115→184) so every "3-in-1" step
 * is now ~x1.00 power (within the x0.95–1.05 band), monotone
 * non-decreasing — never a downgrade. Human ladder per-merge value:
 *   Marine→Sniper  x1.99  (intentional big first jump)
 *   Sniper→Mecha   x0.99
 *   Mecha→Genetic  x1.00
 *   Genetic→Captain x1.00  (Captain = human merge terminus)
 *
 * cycle 17 BAL-4 — Ultralisk→Queen trap REMOVED. Queen (175hp/12atk,
 * pw 2100) is a SUPPORT caster, not a tier-up of the Ultralisk tank line
 * (400hp/40atk, pw 16000); merging 3× Ultralisk into 1 Queen was a ~x0.04
 * (~96%) power annihilation. Ultralisk is now the Zerg merge TERMINUS:
 * absent from this table, mergeRoster throws "…tepesinde" (top of chain),
 * the same graceful cap as Captain on the human side. A proper Zerg T4
 * tank (e.g. Brood-Lord ~520hp/55atk) can be added later — it needs a new
 * UnitType enum value + UNIT_CONFIGS entry + player_units_type_enum
 * migration, so it's deferred rather than shipped in this surgical retune.
 */
export const MERGE_RECIPES: Partial<Record<UnitType, UnitType>> = {
  // İnsan promosyon ladder: Marine → Sniper → Mecha Walker → Genetic
  // Warrior → Captain.  Medic / Siege Tank / Ghost are sidegrade variants
  // without merge results in the current lex — adding them is just a row
  // here once a tier mapping is decided.
  [UnitType.MARINE]:           UnitType.SNIPER,
  [UnitType.SNIPER]:           UnitType.MECHA_WALKER,
  [UnitType.ENGINEER]:         UnitType.MECHA_WALKER,
  [UnitType.MECHA_WALKER]:     UnitType.GENETIC_WARRIOR,
  [UnitType.GENETIC_WARRIOR]:  UnitType.CAPTAIN,
  // Zerg evrim zinciri — UnitType enum'da hâlihazırda bulunan değerleri
  // kullanır.  Zergling (T1) → Hydralisk (T2) → Ultralisk (T3, terminus).
  // Ultralisk→Queen KALDIRILDI (cycle 17 BAL-4): Queen bir destek birimi,
  // Ultralisk tank hattının üst tier'ı değil — merge ~x0.04 güç imhasıydı.
  // Ultralisk artık Zerg merge zincirinin tepesinde (Captain gibi). Gerçek
  // bir Zerg T4 tank (örn. Brood-Lord) eklenince buraya bir satır gelir.
  [UnitType.ZERGLING]:         UnitType.HYDRALISK,
  [UnitType.HYDRALISK]:        UnitType.ULTRALISK,
};

/**
 * Source-type → source-tier mapping for the merge cost ladder.
 *
 * The merge cost (mineral / gas / science) scales linearly with the source
 * tier, mirroring the api-side MergePreviewService.computeCosts contract:
 *   mineral = 100 * sourceTier
 *   gas     = 200 * sourceTier
 *   science =   sourceTier - 3   (only at sourceTier >= 4)
 *
 * Pre-fix (ECON-MERGE-FREE-UPGRADE), mergeRoster never read these costs —
 * the FE displayed them in the preview pane but the POST consumed 3 units
 * and minted the next-tier unit for FREE. This table lets the service
 * resolve "which tier am I promoting FROM" without re-running the api lex
 * resolver (which lives in apps/api and resolves UUIDs differently).
 *
 * Keep in lockstep with MergePreviewService's `resolveTypeToTier`. Adding
 * a new merge recipe row above means adding the source type's tier here
 * too, otherwise mergeRoster's getMergeSourceTier() falls back to 1 and
 * undercharges the merge.
 */
export const MERGE_SOURCE_TIERS: Partial<Record<UnitType, number>> = {
  // Human T1 → result T2 (charge 1× base = 100M / 200G).
  [UnitType.MARINE]:           1,
  // Human T2 → result T3 (charge 2× base = 200M / 400G).
  [UnitType.SNIPER]:           2,
  [UnitType.ENGINEER]:         2,
  // Human T3 → result T4 (charge 3× base = 300M / 600G).
  [UnitType.MECHA_WALKER]:     3,
  // Human T4 → result T5 (charge 4× base = 400M / 800G + 1 science).
  [UnitType.GENETIC_WARRIOR]:  4,
  // Zerg ladder mirrors the same tiering — Zergling T1 → Hydralisk T2 →
  // Ultralisk T3 (merge terminus). cycle 17 BAL-4: Ultralisk dropped from
  // this table in lockstep with MERGE_RECIPES (Ultralisk→Queen trap
  // removed). Ultralisk is no longer a merge SOURCE, so it needs no cost
  // tier — mergeRoster rejects it at the recipe lookup before
  // computeMergeCost ever runs.
  [UnitType.ZERGLING]:         1,
  [UnitType.HYDRALISK]:        2,
};

/**
 * Computes the resource cost for merging 3× sourceType into the next tier.
 *
 * Wired identical to MergePreviewService.computeCosts in apps/api so the FE
 * preview pane and the BE deduct agree to the last coin. `resourceA` /
 * `resourceB` in the preview DTO map to `mineral` / `gas` per the race
 * resource bindings in apps/web/src/lib/nd-tokens.ts; `crystal` (a future
 * resource slot for tier 4+ merges) maps to `science` since the
 * player_resources table doesn't carry a crystal column today.
 *
 * Returns a zero-cost shape when the sourceType isn't a known merge source.
 * mergeRoster gates the recipe lookup BEFORE this, so a zero-cost return
 * here is unreachable in practice — defensive belt-and-braces.
 */
export function computeMergeCost(sourceType: UnitType): {
  mineral: number;
  gas: number;
  energy: number;
  science: number;
} {
  const tier = MERGE_SOURCE_TIERS[sourceType] ?? 0;
  if (tier <= 0) {
    return { mineral: 0, gas: 0, energy: 0, science: 0 };
  }
  return {
    mineral: 100 * tier,
    gas:     200 * tier,
    energy:  0,
    // FE preview returns `crystal: tier-3` when tier >= 4. The wallet
    // doesn't have a crystal column — bind it to science (the closest
    // premium currency the player_resources schema knows about). When
    // the dedicated crystal resource ships, swap this and audit the
    // MergePreviewService catalog in lockstep.
    science: tier >= 4 ? tier - 3 : 0,
  };
}
