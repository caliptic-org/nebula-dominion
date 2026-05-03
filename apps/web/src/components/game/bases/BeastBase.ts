import * as THREE from 'three';
import { Race } from '@/types/units';
import { createGroundGlow, createParticleField, disposeGroup } from './particles';
import type { RaceBaseFactory } from './types';
import { RACE_LIGHT_INTENSITY } from './types';

/**
 * Canavar — Titan Mağarası
 * Cave floor disc surrounded by stalagmite cones, descending stalactite pair, bone clusters,
 * and a central biolumen pool. Selected: pool intensity surges & cave breathes.
 */
export const createBeastBase: RaceBaseFactory = (color, opts) => {
  const compact = !!opts.compact;
  const s = (compact ? 0.55 : 1) * 0.5;
  const root = new THREE.Group();

  const caveStoneMat = new THREE.MeshStandardMaterial({
    color: 0x2a1f0f,
    roughness: 0.92,
    metalness: 0.02,
    emissive: new THREE.Color(0x0a0500),
    emissiveIntensity: 0.05,
  });
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xd4c49a,
    roughness: 0.85,
    metalness: 0.0,
    emissive: new THREE.Color(0xff6600),
    emissiveIntensity: 0.05,
  });
  const biolumenPoolMat = new THREE.MeshStandardMaterial({
    color: 0xff4400,
    roughness: 0.1,
    metalness: 0.0,
    emissive: new THREE.Color(0xff6600),
    emissiveIntensity: 1.8,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });

  const baseBioEmissive = 1.8;
  const baseBioOpacity = 0.7;

  // cave_floor — wide low cylinder
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(4.0 * s, 4.5 * s, 0.3 * s, 12),
    caveStoneMat,
  );
  floor.position.y = 0.15 * s;
  root.add(floor);

  // entry arch — half torus suggesting a cave mouth, oriented vertical & toward camera
  const entryArch = new THREE.Mesh(
    new THREE.TorusGeometry(1.5 * s, 0.25 * s, 8, 16, Math.PI),
    caveStoneMat,
  );
  entryArch.position.set(0, 0.3 * s, 2.5 * s);
  root.add(entryArch);

  // stalagmites — ground cones pointing up
  const stalagmiteSpecs = [
    { r: 0.4, h: 2.8, seg: 6, x: -1.5, z: -1.0 },
    { r: 0.3, h: 3.5, seg: 5, x:  1.2, z: -1.8 },
    { r: 0.5, h: 1.8, seg: 7, x:  1.8, z:  1.2 },
    { r: 0.25, h: 2.2, seg: 5, x: -2.0, z:  1.5 },
  ];
  const stalagmites: THREE.Mesh[] = [];
  stalagmiteSpecs.slice(0, compact ? 2 : 4).forEach(spec => {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(spec.r * s, spec.h * s, spec.seg),
      caveStoneMat,
    );
    mesh.position.set(spec.x * s, 0.3 * s + (spec.h * s) / 2, spec.z * s);
    root.add(mesh);
    stalagmites.push(mesh);
  });

  // stalactites — ceiling cones pointing down
  const stalactiteSpecs = [
    { r: 0.35, h: 2.5, x: -0.5, y: 4.0, z: 0 },
    { r: 0.2, h: 1.8, x:  1.0, y: 4.5, z: -0.5 },
  ];
  const stalactites: THREE.Mesh[] = [];
  if (!compact) {
    stalactiteSpecs.forEach(spec => {
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(spec.r * s, spec.h * s, 6),
        caveStoneMat,
      );
      mesh.rotation.x = Math.PI;
      mesh.position.set(spec.x * s, spec.y * s, spec.z * s);
      root.add(mesh);
      stalactites.push(mesh);
    });
  }

  // bone clusters — randomly sized octahedrons scattered on the floor
  const boneCount = compact ? 3 : 7;
  for (let i = 0; i < boneCount; i++) {
    const a = (i / boneCount) * Math.PI * 2 + 0.4;
    const r = 2.2 + Math.sin(i * 1.7) * 0.6;
    const radius = 0.3 + (i % 3) * 0.1;
    const bone = new THREE.Mesh(
      new THREE.OctahedronGeometry(radius * s, 0),
      boneMat,
    );
    bone.position.set(Math.cos(a) * r * s, 0.3 * s + radius * s * 0.5, Math.sin(a) * r * s);
    bone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    root.add(bone);
  }

  // biolumen pool — flat lava disc + additive glow underneath
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.8 * s, 32),
    biolumenPoolMat,
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.31 * s;
  root.add(pool);

  const poolGlow = createGroundGlow(0xff6600, 3.5 * s, 0.22);
  poolGlow.position.y = 0.32 * s;
  root.add(poolGlow);

  // ground halo
  const glow = createGroundGlow(0xff6600, 8 * s, 0.10);
  glow.position.y = 0.01;
  root.add(glow);

  // particles — orange spore drift + spark flecks
  const spores = createParticleField({
    count: compact ? 14 : 40,
    color: '#ffaa55',
    size: 0.18 * s,
    spread: 3.0 * s,
    velocity: new THREE.Vector3(0, 0.12, 0),
    jitter: 0.2,
    lifespan: [2.0, 4.0],
    spawnRadius: 1.6 * s,
  });
  spores.points.position.y = 0.6 * s;
  root.add(spores.points);

  const bioLight = new THREE.PointLight(0xff6600, RACE_LIGHT_INTENSITY[Race.CANAVAR] * 1.1 * (compact ? 0.5 : 1), 10, 1.6);
  bioLight.position.set(0, 0.7 * s, 0);
  root.add(bioLight);

  const depthLight = new THREE.PointLight(0x330022, 0.6 * (compact ? 0.5 : 1), 8, 1.6);
  depthLight.position.set(0, -0.5 * s, 0);
  root.add(depthLight);

  let selected = false;

  const update = (elapsed: number, dt: number) => {
    if (selected) {
      biolumenPoolMat.emissiveIntensity = 3.0 + Math.sin(elapsed * 3) * 0.8;
      biolumenPoolMat.opacity = baseBioOpacity + 0.2 + Math.sin(elapsed * 3) * 0.1;
      root.scale.y = 1 + Math.sin(elapsed * 2.5) * 0.06;
    } else {
      biolumenPoolMat.emissiveIntensity = baseBioEmissive + Math.sin(elapsed * 1.2) * 0.6;
      biolumenPoolMat.opacity = baseBioOpacity + Math.sin(elapsed * 1.2) * 0.15;
      root.scale.y = 1;
    }

    stalactites.forEach((st, i) => {
      st.rotation.z = Math.sin(elapsed * (0.7 + i * 0.2) + i) * 0.02;
    });
    stalagmites.forEach((sm, i) => {
      sm.scale.y = 1 + Math.sin(elapsed * 0.5 + i * 1.2) * 0.008;
    });

    spores.update(dt);
  };

  const setSelected = (v: boolean) => { selected = v; };

  const dispose = () => {
    disposeGroup(root);
    spores.dispose();
  };

  return { group: root, radius: 4.5 * s, update, setSelected, dispose };
};
