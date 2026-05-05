/**
 * Galaxy Map v2 — shared types
 *
 * Coordinate system: world coordinates are arbitrary units that the map
 * controller projects to screen via translate+scale. Units don't have to
 * match pixels at scale=1 — the controller simply chooses a world->screen
 * factor at scale=1 (here, 1 unit = 1 px) and zooming is applied on top.
 */

export type RaceCode = 'human' | 'zerg' | 'automat' | 'beast' | 'demon';

export type ZoomLevel = 'galaxy' | 'sector' | 'system' | 'base';

export interface Vec2 {
  x: number;
  y: number;
}

export interface SolarSystem {
  id: string;
  name: string;
  /** World position in unit coords. */
  position: Vec2;
  /** Owner race (or null for unclaimed). Drives territory color. */
  owner: RaceCode | null;
  /** Sector grouping — used for sector boundaries / labels. */
  sectorId: string;
  /** Mineral / Gas / Energy stockpiles (null hides the badge). */
  resources: {
    mineral: number | null;
    gas: number | null;
    energy: number | null;
  };
  /** Marked under attack — triggers red double pulse. */
  underAttack?: boolean;
  /** Disputed border — triggers stroke pulse on the territory polygon. */
  contested?: boolean;
}

export interface Fleet {
  id: string;
  raceId: RaceCode;
  /** Current position in world coords; updated by the FleetLayer each frame. */
  position: Vec2;
  /** Movement target; null = stationed. */
  destination: Vec2 | null;
  /** Departure timestamp (ms). Used together with `arrivalAt` to compute progress. */
  departedAt?: number;
  /** Arrival timestamp (ms). */
  arrivalAt?: number;
  type: 'attack' | 'defense' | 'transport';
  /** 1-5 — drives icon size and whether a health bar is shown (>=3). */
  size: number;
  /** Health 0..1. */
  health: number;
}

export interface TradeLine {
  fromSystemId: string;
  toSystemId: string;
  kind: 'trade' | 'alliance';
}

/** Full discovery model — drives fog of war + LOD details. */
export interface DiscoveryState {
  /** Systems ever seen. Drawn dimmed under fog. */
  explored: Set<string>;
  /** Systems currently in scout / fleet vision. Drawn fully lit. */
  visible: Set<string>;
}

export const ZOOM_THRESHOLDS = {
  galaxy: { min: 0.15, max: 0.4, label: 'Galaksi Görünümü' },
  sector: { min: 0.4, max: 1.0, label: 'Sektör Görünümü' },
  system: { min: 1.0, max: 3.0, label: 'Sistem Görünümü' },
  base: { min: 3.0, max: 6.0, label: 'Üs Görünümü' },
} as const;

export function getZoomLevel(scale: number): ZoomLevel {
  if (scale < 0.4) return 'galaxy';
  if (scale < 1.0) return 'sector';
  if (scale < 3.0) return 'system';
  return 'base';
}

export const ZOOM_MIN = 0.15;
export const ZOOM_MAX = 6.0;
