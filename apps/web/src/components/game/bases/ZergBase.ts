import * as THREE from 'three';
import { Race } from '@/types/units';
import { createGroundGlow, createParticleField, disposeGroup } from './particles';
import type { RaceBaseFactory } from './types';
import { RACE_LIGHT_INTENSITY } from './types';

/**
 * Böcek (Zerg) — Kovan Yeraltısı
 * Hive mound dome with a central tunnel mouth (torus + lip ring), curving glowing veins,
 * acid pool with bubbles, kitin spines and larva spawn pods. Selected: hive activates,
 * spines push outward, veins go incandescent.
 */
export const createZergBase: RaceBaseFactory = (color, opts) => {
  const compact = !!opts.compact;
  const s = (compact ? 0.55 : 1) * 0.55;
  const root = new THREE.Group();

  const hiveMat = new THREE.MeshStandardMaterial({
    color: 0x0f1f0a,
    roughness: 0.95,
    metalness: 0.0,
    emissive: new THREE.Color(0x001100),
    emissiveIntensity: 0.08,
  });
  const veinMat = new THREE.MeshStandardMaterial({
    color: 0x003300,
    roughness: 0.6,
    metalness: 0.0,
    emissive: new THREE.Color(0x44ff44),
    emissiveIntensity: 0.7,
  });
  const acidPoolMat = new THREE.MeshStandardMaterial({
    color: 0x002200,
    roughness: 0.05,
    metalness: 0.1,
    emissive: new THREE.Color(0x44ff44),
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const baseVeinEmissive = 0.7;
  const baseAcidEmissive = 1.4;

  // hive_mound — half sphere dome
  const mound = new THREE.Mesh(
    new THREE.SphereGeometry(2.5 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    hiveMat,
  );
  mound.rotation.x = Math.PI;
  mound.position.y = 1.5 * s;
  root.add(mound);

  // tunnel_mouth + lip ring on top of the mound
  const tunnelMouth = new THREE.Mesh(
    new THREE.TorusGeometry(1.0 * s, 0.4 * s, 12, 24),
    hiveMat,
  );
  tunnelMouth.rotation.x = Math.PI / 2;
  tunnelMouth.position.y = 1.6 * s;
  root.add(tunnelMouth);

  const lipRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.2 * s, 0.15 * s, 8, 24),
    veinMat,
  );
  lipRing.rotation.x = Math.PI / 2;
  lipRing.position.y = 1.7 * s;
  root.add(lipRing);

  // acid_pool — bright green disc inside the mound
  const acidPool = new THREE.Mesh(
    new THREE.CircleGeometry(1.5 * s, 32),
    acidPoolMat,
  );
  acidPool.rotation.x = -Math.PI / 2;
  acidPool.position.y = 0.05 * s;
  root.add(acidPool);

  // bubbles — small spheres that breathe in/out on top of the pool
  const acidBubbles: THREE.Mesh[] = [];
  const bubbleCount = compact ? 6 : 12;
  for (let i = 0; i < bubbleCount; i++) {
    const a = (i / bubbleCount) * Math.PI * 2;
    const r = 0.6 + (i % 3) * 0.2;
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 * s, 8, 8),
      acidPoolMat,
    );
    bubble.position.set(Math.cos(a) * r * s, 0.06 * s, Math.sin(a) * r * s);
    root.add(bubble);
    acidBubbles.push(bubble);
  }

  // veins — three curves spilling out of the mound, glowing green
  const veinSpecs = [
    [
      [-2.5, 0.1,  0.0], [-1.5, 0.6,  0.5],
      [ 0.0, 1.2,  0.2], [ 1.2, 0.4, -0.3],
    ],
    [
      [ 2.4, 0.1,  0.5], [ 1.5, 0.7, -0.2],
      [ 0.3, 1.4, -0.5], [-1.0, 0.6, -1.0],
    ],
    [
      [ 0.2, 0.1,  2.4], [-0.4, 0.5,  1.4],
      [-0.8, 1.2,  0.4], [-1.5, 0.4, -0.5],
    ],
  ];
  veinSpecs.slice(0, compact ? 1 : 3).forEach((points, i) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(p[0] * s, p[1] * s, p[2] * s)),
    );
    const tubeRadius = (0.06 - i * 0.01) * s;
    const segments = 18 - i * 2;
    const vein = new THREE.Mesh(
      new THREE.TubeGeometry(curve, segments, tubeRadius, 8, false),
      veinMat,
    );
    root.add(vein);
  });

  // spines — kitin cones positioned at base of the mound (animated outward when selected)
  const spineCount = compact ? 4 : 8;
  const spines: THREE.Mesh[] = [];
  for (let i = 0; i < spineCount; i++) {
    const a = (i / spineCount) * Math.PI * 2;
    const spine = new THREE.Mesh(
      new THREE.ConeGeometry(0.12 * s, 0.8 * s, 5),
      veinMat,
    );
    spine.position.set(Math.cos(a) * 1.5 * s, 0.4 * s, Math.sin(a) * 1.5 * s);
    spine.rotation.z = Math.cos(a) * -0.4;
    spine.rotation.x = Math.sin(a) * 0.4;
    spine.userData.angle = a;
    root.add(spine);
    spines.push(spine);
  }

  // larva spawn pods — wiggling octahedrons around the base
  const larvae: THREE.Mesh[] = [];
  if (!compact) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const larva = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2 * s, 0),
        veinMat,
      );
      larva.position.set(Math.cos(a) * 2.0 * s, 0.1 * s, Math.sin(a) * 2.0 * s);
      root.add(larva);
      larvae.push(larva);
    }
  }

  // membrane web — thin biological sheet stretched in front of the tunnel mouth
  if (!compact) {
    const membraneMat = new THREE.MeshStandardMaterial({
      color: 0x113300,
      roughness: 0.8,
      metalness: 0.0,
      emissive: new THREE.Color(0x44ff44),
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const membrane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5 * s, 2.5 * s, 8, 8),
      membraneMat,
    );
    membrane.position.set(0, 1.6 * s, 0);
    membrane.rotation.x = -Math.PI / 2;
    root.add(membrane);
  }

  const glow = createGroundGlow(0x44ff44, 7 * s, 0.16);
  glow.position.y = 0.01;
  root.add(glow);

  // particles — green spore drift + acid splash bursts
  const spores = createParticleField({
    count: compact ? 10 : 24,
    color: '#88ff88',
    size: 0.15 * s,
    spread: 2.6 * s,
    velocity: new THREE.Vector3(0, 0.18, 0),
    jitter: 0.5,
    lifespan: [1.5, 3.0],
    spawnRadius: 1.4 * s,
  });
  spores.points.position.y = 0.6 * s;
  root.add(spores.points);

  const splash = createParticleField({
    count: compact ? 8 : 18,
    color: '#aaff77',
    size: 0.10 * s,
    spread: 1.6 * s,
    velocity: new THREE.Vector3(0, 0.6, 0),
    jitter: 0.4,
    lifespan: [0.4, 0.9],
    spawnRadius: 0.9 * s,
  });
  splash.points.position.y = 0.1 * s;
  root.add(splash.points);

  const toxicLight = new THREE.PointLight(0x44ff44, RACE_LIGHT_INTENSITY[Race.ZERG] * 1.2 * (compact ? 0.5 : 1), 11, 1.6);
  toxicLight.position.set(0, 0.6 * s, 1.0 * s);
  root.add(toxicLight);

  const tunnelLight = new THREE.PointLight(0x002200, 0.3 * (compact ? 0.5 : 1), 4, 1.6);
  tunnelLight.position.set(0, 0.3 * s, 0);
  root.add(tunnelLight);

  let selected = false;

  const update = (elapsed: number, dt: number) => {
    if (selected) {
      veinMat.emissiveIntensity = 1.5 + Math.sin(elapsed * 4) * 0.4;
      acidPoolMat.emissiveIntensity = 2.5 + Math.sin(elapsed * 3) * 0.6;
      spines.forEach((sp, i) => {
        const a = sp.userData.angle as number;
        const r = 1.5 * s + Math.sin(elapsed * 2 + i * 0.4) * 0.3 * s;
        sp.position.x = Math.cos(a) * r;
        sp.position.z = Math.sin(a) * r;
      });
    } else {
      veinMat.emissiveIntensity = baseVeinEmissive + Math.sin(elapsed * 2.0) * 0.3;
      acidPoolMat.emissiveIntensity = baseAcidEmissive + Math.sin(elapsed * 1.5) * 0.4;
      spines.forEach((sp, i) => {
        const a = sp.userData.angle as number;
        const rest = 1.5 * s + Math.sin(elapsed * 0.8 + i) * 0.04 * s;
        sp.position.x = Math.cos(a) * rest;
        sp.position.z = Math.sin(a) * rest;
      });
    }

    acidBubbles.forEach((b, i) => {
      b.position.y = 0.06 * s + Math.sin(elapsed * 3 + i * 0.6) * 0.05 * s;
      const sc = 0.8 + Math.sin(elapsed * 2.5 + i) * 0.2;
      b.scale.setScalar(sc);
    });

    const tunnelPulse = 1 + Math.sin(elapsed * 0.8) * 0.04;
    tunnelMouth.scale.set(tunnelPulse, 1, tunnelPulse);

    larvae.forEach((l, i) => {
      l.rotation.y += 0.01 + i * 0.003;
      l.position.y = 0.1 * s + Math.sin(elapsed * 1.5 + i) * 0.05 * s;
    });

    spores.update(dt);
    splash.update(dt);
  };

  const setSelected = (v: boolean) => { selected = v; };

  const dispose = () => {
    disposeGroup(root);
    spores.dispose();
    splash.dispose();
  };

  return { group: root, radius: 3.0 * s, update, setSelected, dispose };
};
