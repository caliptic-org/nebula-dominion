/* Battle HUD v2 — Tactical battle screen (CAL-357 / BRIEF 4-of-4 in CAL-348). */

import type { Race } from '@/types/units';

export type BattleSide = 'friendly' | 'enemy';
export type UnitStatus = 'idle' | 'attacking' | 'defending' | 'moving';
export type DamageType = 'damage' | 'critical' | 'heal' | 'miss';

/** Buff / debuff status effects displayed as icon strips on units. */
export type StatusEffectType =
  | 'shield'      // +def (blue)
  | 'poison'      // DoT (green)
  | 'burn'        // DoT (orange)
  | 'freeze'      // immobilize (cyan)
  | 'stun'        // no actions (yellow)
  | 'regenerate'  // HoT (bright green pulse)
  | 'haste'       // +speed (cyan)
  | 'slow';       // -speed (grey)

export interface StatusEffect {
  type: StatusEffectType;
  /** Remaining duration in seconds. Use Infinity for permanent (e.g. passive auras). */
  duration: number;
  /** Stack count — shown as a number badge when > 1. */
  stacks?: number;
}

export interface BattleUnit {
  id: string;
  name: string;
  portrait: string;
  hp: number;
  maxHp: number;
  morale: number; // 0–100
  status: UnitStatus;
  side: BattleSide;
  /** World coords inside `BATTLEFIELD_BOUNDS` (rendered & minimap). */
  x: number;
  y: number;
  controlGroup?: number;
  /** Active buffs and debuffs on this unit. */
  statusEffects?: StatusEffect[];
}

export interface AbilityDef {
  id: string;
  name: string;
  hotkey: 'Q' | 'W' | 'E' | 'R' | 'A' | 'S';
  glyph: string; // emoji/character — used as fallback when iconKey has no manifest entry
  /** Key into ABILITY_ICONS in `base-v2/asset-manifest.ts`. */
  iconKey?: 'attack' | 'defend' | 'special' | 'ultimate' | 'rally' | 'move';
  cooldownSeconds: number;
  remainingCooldown: number;
  ultimate?: boolean;
  description: string;
}

export interface ResourceState {
  mineral: number;
  gas: number;
  energy: number;
}

export interface WaveState {
  current: number;
  total: number;
  nextInSeconds: number;
  totalSeconds: number;
}

export interface DamageNumber {
  id: string;
  value: number;
  type: DamageType;
  /** World-space coords inside the battlefield. */
  x: number;
  y: number;
  spawnedAt: number;
}

export interface ControlGroup {
  num: number;
  size: number;
}

export interface BattleSnapshot {
  race: Race;
  resources: ResourceState;
  resourceRates: ResourceState;
  wave: WaveState;
  speed: 0.5 | 1 | 2;
  paused: boolean;
  units: BattleUnit[];
  enemies: BattleUnit[];
  combats: { x: number; y: number }[];
  selectedUnitId: string | null;
  abilities: AbilityDef[];
  controlGroups: ControlGroup[];
  damageNumbers: DamageNumber[];
  populationCap: number;
}

/** World-space dimensions used for unit positions, minimap projections, etc. */
export const BATTLEFIELD_BOUNDS = { width: 1000, height: 700 } as const;
