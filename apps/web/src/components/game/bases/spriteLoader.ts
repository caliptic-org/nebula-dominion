import * as THREE from 'three';
import { Race } from '@/types/units';

/**
 * Sprite paths for CAL-338 deliverables. The loader fails gracefully when a file
 * is missing — falling back to procedural geometry — so that the map still
 * renders if asset delivery is delayed.
 */
const ENEMY_SPRITE_PATHS: Record<Race, string> = {
  [Race.INSAN]:   '/assets/sprites/enemies/insan_guardian.png',
  [Race.OTOMAT]:  '/assets/sprites/enemies/otomat_drone.png',
  [Race.SEYTAN]:  '/assets/sprites/enemies/seytan_void.png',
  [Race.CANAVAR]: '/assets/sprites/enemies/canavar_titan.png',
  [Race.ZERG]:    '/assets/sprites/enemies/zerg_hive.png',
};

const RESOURCE_SPRITE_PATHS: Record<'mineral' | 'gas' | 'energy', string> = {
  mineral: '/assets/sprites/resources/mineral.png',
  gas:     '/assets/sprites/resources/gas.png',
  energy:  '/assets/sprites/resources/energy.png',
};

const loader = new THREE.TextureLoader();
const cache = new Map<string, Promise<THREE.Texture | null>>();

function loadOptional(path: string): Promise<THREE.Texture | null> {
  if (cache.has(path)) return cache.get(path)!;
  const p = new Promise<THREE.Texture | null>((resolve) => {
    loader.load(
      path,
      tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        resolve(tex);
      },
      undefined,
      () => resolve(null), // 404 → fall back to procedural
    );
  });
  cache.set(path, p);
  return p;
}

export async function loadEnemySprite(race: Race): Promise<THREE.Texture | null> {
  return loadOptional(ENEMY_SPRITE_PATHS[race]);
}

export async function loadResourceSprite(kind: 'mineral' | 'gas' | 'energy'): Promise<THREE.Texture | null> {
  return loadOptional(RESOURCE_SPRITE_PATHS[kind]);
}

/** Synchronous accessor for already-resolved textures (returns undefined if not yet loaded). */
export function readCachedTexture(path: string): THREE.Texture | null | undefined {
  const p = cache.get(path);
  if (!p) return undefined;
  // Bridge: peek at the resolved value without awaiting.
  let result: THREE.Texture | null | undefined = undefined;
  p.then(v => { result = v; });
  return result;
}

/** Pre-warms the texture cache for the listed races so the scene doesn't pop. */
export function preloadSprites(races: Race[]) {
  races.forEach(r => loadEnemySprite(r));
  loadResourceSprite('mineral');
  loadResourceSprite('gas');
  loadResourceSprite('energy');
}

export { ENEMY_SPRITE_PATHS, RESOURCE_SPRITE_PATHS };
