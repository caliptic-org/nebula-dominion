import * as THREE from 'three';
import { Race } from '@/types/units';

export interface RaceBaseOptions {
  /** Smaller silhouette for non-player / opponent bases. */
  compact?: boolean;
  /** Hero level — drives subtle scale + light intensity. */
  level?: number;
  /** Marks the local player base — only one of these per scene. */
  isPlayer?: boolean;
}

export interface RaceBaseInstance {
  /** Root group — caller positions/rotates this. */
  group: THREE.Group;
  /** Approximate bounding radius for hit-testing & ring sizing. */
  radius: number;
  /** Per-frame animation step. The host still owns the outer selection ring. */
  update: (elapsed: number, dt: number) => void;
  /** Toggle race-specific "selected" animation (overcharge, portal swirl, hive wake, etc.). */
  setSelected?: (selected: boolean) => void;
  /** Geometry/material/texture cleanup. */
  dispose: () => void;
}

export type RaceBaseFactory = (color: string, opts: RaceBaseOptions) => RaceBaseInstance;

/** Race-specific accent light intensity (PointLight) per the geometry brief. */
export const RACE_LIGHT_INTENSITY: Record<Race, number> = {
  [Race.INSAN]:   1.5,
  [Race.OTOMAT]:  2.0,
  [Race.SEYTAN]:  2.5,
  [Race.CANAVAR]: 1.8,
  [Race.ZERG]:    1.5,
};
