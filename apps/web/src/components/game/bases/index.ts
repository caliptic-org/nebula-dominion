import * as THREE from 'three';
import { Race } from '@/types/units';
import { createHumanBase } from './HumanBase';
import { createAutomatonBase } from './AutomatonBase';
import { createDemonBase } from './DemonBase';
import { createBeastBase } from './BeastBase';
import { createZergBase } from './ZergBase';
import type { RaceBaseFactory, RaceBaseInstance, RaceBaseOptions } from './types';

export type { RaceBaseInstance, RaceBaseOptions } from './types';

/** Race color palette — kept here to keep race rendering self-contained. */
export const RACE_BASE_COLOR: Record<Race, string> = {
  [Race.INSAN]:   '#4a9eff',
  [Race.ZERG]:    '#44ff44',
  [Race.OTOMAT]:  '#00cfff',
  [Race.CANAVAR]: '#ff6600',
  [Race.SEYTAN]:  '#cc00ff',
};

const FACTORIES: Record<Race, RaceBaseFactory> = {
  [Race.INSAN]:   createHumanBase,
  [Race.OTOMAT]:  createAutomatonBase,
  [Race.SEYTAN]:  createDemonBase,
  [Race.CANAVAR]: createBeastBase,
  [Race.ZERG]:    createZergBase,
};

/** Compose a race-specific procedural base. The host owns positioning + selection rings. */
export function createRaceBase(race: Race, opts: RaceBaseOptions = {}): RaceBaseInstance {
  const factory = FACTORIES[race];
  const color = RACE_BASE_COLOR[race];
  return factory(color, opts);
}

/**
 * InstancedMesh fallback for high-density base counts (50+).
 * Renders one merged silhouette per race using a single shared icosahedron.
 * Trades fidelity for fill-rate when the map is crowded.
 */
export function createInstancedBaseField(
  positions: Array<{ race: Race; position: THREE.Vector3; isPlayer?: boolean }>,
): { groups: THREE.Group; dispose: () => void } {
  const root = new THREE.Group();
  const byRace = new Map<Race, Array<{ position: THREE.Vector3; isPlayer?: boolean }>>();
  positions.forEach(p => {
    if (!byRace.has(p.race)) byRace.set(p.race, []);
    byRace.get(p.race)!.push(p);
  });

  const disposers: Array<() => void> = [];
  const dummy = new THREE.Object3D();

  byRace.forEach((items, race) => {
    if (items.length === 0) return;
    const color = RACE_BASE_COLOR[race];
    const geom = new THREE.IcosahedronGeometry(1.4, 1);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.7,
      roughness: 0.45,
      metalness: 0.3,
      flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geom, mat, items.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    items.forEach((item, i) => {
      dummy.position.copy(item.position);
      dummy.scale.setScalar(item.isPlayer ? 1.4 : 0.9);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
    disposers.push(() => { geom.dispose(); mat.dispose(); });
  });

  return {
    groups: root,
    dispose: () => disposers.forEach(d => d()),
  };
}
