import * as THREE from 'three';
import { Race } from '@/types/units';
import { createGroundGlow, createParticleField, disposeGroup } from './particles';
import type { RaceBaseFactory } from './types';
import { RACE_LIGHT_INTENSITY } from './types';

/**
 * İnsan — Yıldız Düşüşü Sarayı
 * Octagonal marble platform + central tower with dome & gold spire + 2 wing towers,
 * orbited by twin gold rings. Idle: levitation + ring orbits. Selected: marble & gold pulse.
 */
export const createHumanBase: RaceBaseFactory = (color, opts) => {
  const compact = !!opts.compact;
  const s = (compact ? 0.55 : 1) * 0.55;
  const root = new THREE.Group();

  // Lift carries everything that levitates; ground glow stays on root so it sticks to the floor.
  const lift = new THREE.Group();
  root.add(lift);

  // Per-instance materials so emissive pulse on one base doesn't bleed into others.
  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xf0f4ff,
    roughness: 0.15,
    metalness: 0.05,
    emissive: new THREE.Color(0x4a9eff),
    emissiveIntensity: 0.08,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    roughness: 0.2,
    metalness: 0.95,
    emissive: new THREE.Color(0xffa000),
    emissiveIntensity: 0.3,
  });
  const baseMarbleEmissive = 0.08;
  const baseGoldEmissive = 0.3;

  // base_platform — octagonal slab
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5 * s, 4.0 * s, 0.4 * s, 8),
    marbleMat,
  );
  platform.position.y = 0.2 * s;
  lift.add(platform);

  // central_tower + dome + spire
  const centralTower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6 * s, 1.2 * s, 4.5 * s, 8),
    marbleMat,
  );
  centralTower.position.y = 0.4 * s + 4.5 * s * 0.5;
  lift.add(centralTower);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.8 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    marbleMat,
  );
  dome.position.y = 0.4 * s + 4.5 * s;
  lift.add(dome);

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.15 * s, 2.0 * s, 8),
    goldMat,
  );
  spire.position.y = dome.position.y + 0.6 * s + 1.0 * s;
  lift.add(spire);

  // wing towers L/R (skipped on compact silhouette to keep the count down)
  const wingBaseY = 0.4 * s + 1.5 * s;
  const makeWing = (xSign: number) => {
    const wing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4 * s, 0.7 * s, 3.0 * s, 8),
      marbleMat,
    );
    wing.position.set(2.0 * s * xSign, wingBaseY, 0);
    const wingSpire = new THREE.Mesh(
      new THREE.ConeGeometry(0.1 * s, 1.2 * s, 8),
      goldMat,
    );
    wingSpire.position.y = 1.5 * s + 0.6 * s;
    wing.add(wingSpire);
    lift.add(wing);
    return wing;
  };
  const wingL = compact ? null : makeWing(-1);
  const wingR = compact ? null : makeWing(+1);

  // Orbital rings — ring1 horizontal, ring2 tilted 45°.
  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(2.5 * s, 0.06 * s, 8, 48),
    goldMat,
  );
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = 2.4 * s;
  lift.add(ring1);

  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(1.8 * s, 0.04 * s, 8, 48),
    goldMat,
  );
  ring2.rotation.x = Math.PI / 4;
  ring2.position.y = 3.0 * s;
  lift.add(ring2);

  // Ground glow — lives on root so it doesn't levitate away from the floor.
  const glow = createGroundGlow(0x4a9eff, 8 * s, 0.12);
  glow.position.y = 0.01;
  root.add(glow);

  // Gold star-dust particles inside the lift so they ride with the silhouette.
  const sparks = createParticleField({
    count: compact ? 20 : 64,
    color: '#ffd700',
    size: 0.16 * s,
    spread: 4.0 * s,
    velocity: new THREE.Vector3(0, 0.35, 0),
    jitter: 0.25,
    lifespan: [2.0, 3.5],
    spawnRadius: 1.8 * s,
  });
  sparks.points.position.y = 1.0 * s;
  lift.add(sparks.points);

  const light = new THREE.PointLight(0x6ab8ff, RACE_LIGHT_INTENSITY[Race.INSAN] * 1.2 * (compact ? 0.5 : 1), 12, 1.6);
  light.position.set(0, 3 * s, 0);
  root.add(light);

  let selected = false;

  const update = (elapsed: number, dt: number) => {
    lift.position.y = Math.sin(elapsed * 0.8) * 0.12 * s;
    ring1.rotation.z += 0.004;
    ring2.rotation.x += 0.003;
    ring2.rotation.z += 0.002;
    if (wingL) wingL.position.y = wingBaseY + Math.sin(elapsed * 1.1) * 0.08 * s;
    if (wingR) wingR.position.y = wingBaseY + Math.sin(elapsed * 1.1 + 0.5) * 0.08 * s;
    sparks.update(dt);

    if (selected) {
      const pulse = 1 + Math.sin(elapsed * 3) * 0.04;
      lift.scale.setScalar(pulse);
      marbleMat.emissiveIntensity = baseMarbleEmissive + 0.10 + Math.sin(elapsed * 3) * 0.06;
      goldMat.emissiveIntensity = baseGoldEmissive + 0.20 + Math.sin(elapsed * 4) * 0.15;
    } else {
      lift.scale.setScalar(1);
      marbleMat.emissiveIntensity = baseMarbleEmissive;
      goldMat.emissiveIntensity = baseGoldEmissive;
    }
  };

  const setSelected = (v: boolean) => { selected = v; };

  const dispose = () => {
    disposeGroup(root);
    sparks.dispose();
  };

  return { group: root, radius: 4.0 * s, update, setSelected, dispose };
};
