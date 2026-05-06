import type { Race } from '@/types/units';

export type ResourceKind = 'mineral' | 'gas' | 'energy';

export interface ResourceState {
  mineral: number;
  gas: number;
  energy: number;
  population: { current: number; cap: number };
  rates: { mineral: number; gas: number; energy: number };
}

export interface ProductionItem {
  id: string;
  unitKey: string;
  unitLabel: string;
  unitIcon: string;
  buildSeconds: number;
  remainingSeconds: number;
}

export type BuildingStatus = 'idle' | 'producing' | 'upgrading' | 'damaged';

export interface BaseBuilding {
  id: string;
  type: string;
  name: string;
  thumbnail: string;
  isoSprite: string;
  level: number;
  maxLevel: number;
  hp: number;
  maxHp: number;
  isoX: number;
  isoY: number;
  status: BuildingStatus;
  queue: ProductionItem[];
  queueCapacity: number;
  upgrade?: {
    nextLevel: number;
    costMineral: number;
    costGas: number;
    seconds: number;
  };
  commands: CommandAction[];
}

export interface CommandAction {
  id: string;
  hotkey: string;
  label: string;
  icon: string;
  iconAsset?: string;
  costMineral?: number;
  costGas?: number;
  costEnergy?: number;
  popCost?: number;
  buildSeconds?: number;
  description: string;
  kind: 'train' | 'upgrade' | 'rally' | 'special';
  spawnUnit?: { unitKey: string; unitLabel: string; unitIcon: string };
}

export interface RaceBaseSnapshot {
  race: Race;
  resources: ResourceState;
  buildings: BaseBuilding[];
  /** Approx tile dimensions of the iso grid (used by minimap). */
  gridWidth: number;
  gridHeight: number;
  /** Static rally/spawn marker on the iso grid. */
  rallyPoint: { x: number; y: number } | null;
  /** Enemy/neutral pings shown on minimap. */
  pings: { x: number; y: number; tone: 'enemy' | 'ally' | 'neutral' }[];
}
