import * as THREE from 'three';
import { Race } from '@/types/units';
import { createGroundGlow, createParticleField, disposeGroup } from './particles';
import type { RaceBaseFactory } from './types';
import { RACE_LIGHT_INTENSITY } from './types';

/**
 * Otomat — Kronos Fabrikası
 * Industrial slab platform + cylindrical reactor (glowing core, ring) with chimneys,
 * three contra-rotating gears and a corner-conduit grid. Selected: reactor overcharge.
 */
export const createAutomatonBase: RaceBaseFactory = (color, opts) => {
  const compact = !!opts.compact;
  const s = (compact ? 0.55 : 1) * 0.45;
  const root = new THREE.Group();

  const industrialMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a55,
    roughness: 0.7,
    metalness: 0.85,
    emissive: new THREE.Color(0x001a2a),
    emissiveIntensity: 0.1,
  });
  const reactorCoreMat = new THREE.MeshStandardMaterial({
    color: 0x00cfff,
    roughness: 0.1,
    metalness: 0.3,
    emissive: new THREE.Color(0x00cfff),
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.9,
  });
  const energyConduitMat = new THREE.MeshStandardMaterial({
    color: 0x004466,
    roughness: 0.3,
    metalness: 0.9,
    emissive: new THREE.Color(0x00cfff),
    emissiveIntensity: 0.6,
  });

  const baseCoreEmissive = 1.2;

  // platform
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(6 * s, 0.5 * s, 6 * s),
    industrialMat,
  );
  platform.position.y = 0.25 * s;
  root.add(platform);

  // reactor_base + core + ring
  const reactorBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0 * s, 1.2 * s, 2.0 * s, 16),
    industrialMat,
  );
  reactorBase.position.y = 0.5 * s + 1.0 * s;
  root.add(reactorBase);

  const reactorCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.7 * s, compact ? 16 : 32, compact ? 12 : 32),
    reactorCoreMat,
  );
  reactorCore.position.y = reactorBase.position.y + 0.2 * s;
  root.add(reactorCore);

  const reactorRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.1 * s, 0.12 * s, 8, 32),
    industrialMat,
  );
  reactorRing.rotation.x = Math.PI / 2;
  reactorRing.position.y = reactorBase.position.y + 0.9 * s;
  root.add(reactorRing);

  // chimneys (skip on compact silhouette)
  const chimneySpecs = compact
    ? []
    : [
        { r1: 0.2, r2: 0.25, h: 3.0, x: -2, z: -2 },
        { r1: 0.2, r2: 0.25, h: 2.5, x:  2, z: -2 },
        { r1: 0.15, r2: 0.2, h: 3.5, x: -2, z:  2 },
      ];
  chimneySpecs.forEach(c => {
    const ch = new THREE.Mesh(
      new THREE.CylinderGeometry(c.r1 * s, c.r2 * s, c.h * s, 8),
      industrialMat,
    );
    ch.position.set(c.x * s, 0.5 * s + (c.h * s) / 2, c.z * s);
    root.add(ch);
  });

  // gears — each is a hub + radial teeth, rotated to face up so they spin around Y.
  const buildGear = (radius: number, teeth: number) => {
    const g = new THREE.Group();
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, 0.2 * s, 16),
      industrialMat,
    );
    g.add(hub);
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 0.25, 0.2 * s, radius * 0.2),
        industrialMat,
      );
      tooth.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      tooth.rotation.y = -a;
      g.add(tooth);
    }
    return g;
  };

  const gearLarge = buildGear(0.9 * s, 12);
  gearLarge.position.set(-1.5 * s, 1.5 * s, 1.5 * s);
  root.add(gearLarge);

  const gearMedium = buildGear(0.7 * s, 10);
  gearMedium.position.set(1.8 * s, 1.2 * s, 1.0 * s);
  root.add(gearMedium);

  const gearSmall = buildGear(0.5 * s, 8);
  gearSmall.position.set(0.5 * s, 1.0 * s, 2.0 * s);
  root.add(gearSmall);

  // pipe_network — single Catmull curve through a few platform points.
  if (!compact) {
    const pipeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.5 * s, 0.6 * s, -2.0 * s),
      new THREE.Vector3(-0.8 * s, 0.8 * s, -0.5 * s),
      new THREE.Vector3( 0.8 * s, 0.7 * s,  0.5 * s),
      new THREE.Vector3( 2.5 * s, 0.6 * s,  2.0 * s),
    ]);
    const pipe = new THREE.Mesh(
      new THREE.TubeGeometry(pipeCurve, 20, 0.08 * s, 8, false),
      energyConduitMat,
    );
    root.add(pipe);
  }

  // energy_conduit x4 — vertical glow tubes at platform corners
  [[-1, -1], [ 1, -1], [-1,  1], [ 1,  1]].forEach(([cx, cz]) => {
    const conduit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 1.5 * s, 6),
      energyConduitMat,
    );
    conduit.position.set(cx * 2.7 * s, 0.5 * s + 0.75 * s, cz * 2.7 * s);
    root.add(conduit);
  });

  const glow = createGroundGlow(0x00cfff, 7 * s, 0.14);
  glow.position.y = 0.01;
  root.add(glow);

  // sparks — short blue arcs around the gears
  const sparks = createParticleField({
    count: compact ? 12 : 32,
    color: '#00cfff',
    size: 0.10 * s,
    spread: 2.0 * s,
    velocity: new THREE.Vector3(0, 0.2, 0),
    jitter: 0.6,
    lifespan: [0.3, 0.8],
    spawnRadius: 1.2 * s,
  });
  sparks.points.position.y = 1.4 * s;
  root.add(sparks.points);

  const light = new THREE.PointLight(0x00cfff, RACE_LIGHT_INTENSITY[Race.OTOMAT] * 1.1 * (compact ? 0.5 : 1), 14, 1.6);
  light.position.set(0, 1.6 * s, 0);
  root.add(light);

  const accentLight = new THREE.PointLight(0xff3300, 0.4 * (compact ? 0.5 : 1), 5, 1.6);
  accentLight.position.set(-1.5 * s, 2 * s, 1.5 * s);
  root.add(accentLight);

  let selected = false;

  const update = (elapsed: number, dt: number) => {
    const speedScale = selected ? 3 : 1;
    gearLarge.rotation.y += 0.008 * speedScale;
    gearMedium.rotation.y -= 0.013 * speedScale;
    gearSmall.rotation.y += 0.019 * speedScale;
    reactorRing.rotation.z += 0.02;

    const corePulse = 1 + Math.sin(elapsed * 2.5) * 0.06;
    reactorCore.scale.setScalar(corePulse);
    if (selected) {
      reactorCoreMat.emissiveIntensity = 2.0 + Math.sin(elapsed * 6) * 0.5;
    } else {
      reactorCoreMat.emissiveIntensity = baseCoreEmissive + Math.sin(elapsed * 2.5) * 0.4;
    }
    sparks.update(dt);
  };

  const setSelected = (v: boolean) => { selected = v; };

  const dispose = () => {
    disposeGroup(root);
    sparks.dispose();
  };

  return { group: root, radius: 3.5 * s, update, setSelected, dispose };
};
