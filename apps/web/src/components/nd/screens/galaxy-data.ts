/* Galaxy node graph — handoff prototype data. Static graph rendered as the
 * Galactic Map. Ownership is computed from the player's race; enemies
 * use `RACES[playerRace].enemyRace` from nd-tokens. */

import type { NDRaceKey } from '@/components/handoff';

export type NodeKind = 'capital' | 'colony' | 'mine' | 'relay';
export type NodeOwner = 'player' | 'enemy' | 'neutral' | 'contested';

export interface GalaxyNode {
  id: string;
  label: string;
  /** 0..100 % position inside the map viewport. */
  x: number;
  y: number;
  kind: NodeKind;
  owner: NodeOwner;
  /** Garrison / fleet count. */
  power: number;
  level: number;
  /** Optional race override for neutral pirates / mercenaries. */
  raceKey?: NDRaceKey;
}

export interface GalaxyEdge {
  from: string;
  to: string;
}

/** Static prototype graph. 18 nodes / 22 edges arranged like a star chart. */
export const GALAXY_NODES: GalaxyNode[] = [
  { id: 'cap',  label: 'KAEL-7',   x: 18, y: 50, kind: 'capital', owner: 'player', power: 4200, level: 9 },
  { id: 'c1',   label: 'Vega-2',   x: 30, y: 28, kind: 'colony',  owner: 'player', power: 1180, level: 5 },
  { id: 'c2',   label: 'Vega-3',   x: 28, y: 72, kind: 'colony',  owner: 'player', power: 980,  level: 4 },
  { id: 'm1',   label: 'Aether',   x: 42, y: 16, kind: 'mine',    owner: 'player', power: 320,  level: 3 },
  { id: 'r1',   label: 'Pulsar-A', x: 42, y: 50, kind: 'relay',   owner: 'player', power: 60,   level: 2 },
  { id: 'n1',   label: 'Helix',    x: 50, y: 36, kind: 'colony',  owner: 'neutral',power: 540,  level: 3 },
  { id: 'n2',   label: 'Orion-9',  x: 50, y: 64, kind: 'colony',  owner: 'neutral',power: 720,  level: 4 },
  { id: 'co1',  label: 'Drift-7',  x: 58, y: 22, kind: 'mine',    owner: 'contested', power: 880, level: 5 },
  { id: 'co2',  label: 'Sigma-X',  x: 60, y: 50, kind: 'relay',   owner: 'contested', power: 1240, level: 6 },
  { id: 'co3',  label: 'Drift-9',  x: 58, y: 78, kind: 'mine',    owner: 'contested', power: 760, level: 5 },
  { id: 'e1',   label: 'Brood-A',  x: 72, y: 30, kind: 'colony',  owner: 'enemy',  power: 2140, level: 7 },
  { id: 'e2',   label: 'Brood-B',  x: 72, y: 70, kind: 'colony',  owner: 'enemy',  power: 1820, level: 6 },
  { id: 'em1',  label: 'Forge-3',  x: 82, y: 18, kind: 'mine',    owner: 'enemy',  power: 460,  level: 4 },
  { id: 'em2',  label: 'Forge-5',  x: 82, y: 82, kind: 'mine',    owner: 'enemy',  power: 420,  level: 4 },
  { id: 'ecap', label: 'BROOD-1',  x: 92, y: 50, kind: 'capital', owner: 'enemy',  power: 5840, level: 10 },
  { id: 'p1',   label: 'Wyrm',     x: 14, y: 22, kind: 'mine',    owner: 'neutral',power: 180,  level: 2 },
  { id: 'p2',   label: 'Wyrm-II',  x: 14, y: 78, kind: 'mine',    owner: 'neutral',power: 200,  level: 2 },
  { id: 'p3',   label: 'Halo-3',   x: 36, y: 50, kind: 'relay',   owner: 'neutral',power: 90,   level: 2 },
];

export const GALAXY_EDGES: GalaxyEdge[] = [
  { from: 'cap', to: 'c1' }, { from: 'cap', to: 'c2' }, { from: 'cap', to: 'p3' },
  { from: 'cap', to: 'p1' }, { from: 'cap', to: 'p2' },
  { from: 'c1', to: 'm1' }, { from: 'c1', to: 'r1' }, { from: 'c2', to: 'r1' },
  { from: 'r1', to: 'n1' }, { from: 'r1', to: 'n2' }, { from: 'p3', to: 'r1' },
  { from: 'n1', to: 'co1' }, { from: 'n1', to: 'co2' },
  { from: 'n2', to: 'co2' }, { from: 'n2', to: 'co3' },
  { from: 'co1', to: 'e1' }, { from: 'co2', to: 'e1' }, { from: 'co2', to: 'e2' },
  { from: 'co3', to: 'e2' },
  { from: 'e1', to: 'em1' }, { from: 'e2', to: 'em2' },
  { from: 'e1', to: 'ecap' }, { from: 'e2', to: 'ecap' },
];
