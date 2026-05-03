import * as THREE from 'three';
import { Race } from '@/types/units';
import { createGroundGlow, createParticleField, disposeGroup } from './particles';
import type { RaceBaseFactory } from './types';
import { RACE_LIGHT_INTENSITY } from './types';

/**
 * Şeytan — Cehennem Kapısı
 * Two octahedron base rocks flank a hex-column arch with a half-torus crown.
 * Between the columns sits a violet void plane with floating runes, lava cracks,
 * and a scatter of skull octahedrons. Selected: portal opens & lava intensifies.
 */
export const createDemonBase: RaceBaseFactory = (color, opts) => {
  const compact = !!opts.compact;
  const s = (compact ? 0.55 : 1) * 0.45;
  const root = new THREE.Group();

  const darkRockMat = new THREE.MeshStandardMaterial({
    color: 0x0d0008,
    roughness: 0.95,
    metalness: 0.0,
    emissive: new THREE.Color(0x2a0040),
    emissiveIntensity: 0.15,
  });
  const voidPortalMat = new THREE.MeshBasicMaterial({
    color: 0x1a0033,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xff2200,
    roughness: 0.4,
    metalness: 0.0,
    emissive: new THREE.Color(0xff4400),
    emissiveIntensity: 1.5,
  });
  const runeMat = new THREE.MeshBasicMaterial({
    color: 0xcc00ff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const baseLavaEmissive = 1.5;

  // base_rock L/R — octahedron boulders flanking the gate
  const rockL = new THREE.Mesh(new THREE.OctahedronGeometry(1.8 * s, 1), darkRockMat);
  rockL.position.set(-2.0 * s, 0.9 * s, 0);
  root.add(rockL);

  const rockR = new THREE.Mesh(new THREE.OctahedronGeometry(1.6 * s, 1), darkRockMat);
  rockR.position.set(2.0 * s, 0.8 * s, 0);
  root.add(rockR);

  // gate arches — hexagonal columns
  const archL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3 * s, 0.5 * s, 5.0 * s, 6),
    darkRockMat,
  );
  archL.position.set(-1.7 * s, 2.5 * s, 0);
  root.add(archL);

  const archR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3 * s, 0.5 * s, 5.0 * s, 6),
    darkRockMat,
  );
  archR.position.set(1.7 * s, 2.5 * s, 0);
  root.add(archR);

  // gate_top — half torus sitting on the columns, opening upward
  const gateTop = new THREE.Mesh(
    new THREE.TorusGeometry(1.7 * s, 0.3 * s, 6, 16, Math.PI),
    darkRockMat,
  );
  gateTop.position.set(0, 5.0 * s, 0);
  root.add(gateTop);

  // void_portal — violet plane between the columns
  const voidPortal = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0 * s, 4.0 * s, compact ? 8 : 32, compact ? 8 : 32),
    voidPortalMat,
  );
  voidPortal.position.set(0, 2.5 * s, 0);
  root.add(voidPortal);

  // lava cracks — narrow planes laid flat on the ground
  const lavaCracks: THREE.Mesh[] = [];
  if (!compact) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const crack = new THREE.Mesh(
        new THREE.PlaneGeometry(0.1 * s, 2.0 * s),
        lavaMat,
      );
      crack.rotation.x = -Math.PI / 2;
      crack.rotation.z = a + Math.PI / 8;
      crack.position.set(Math.cos(a) * 1.1 * s, 0.02, Math.sin(a) * 1.1 * s);
      root.add(crack);
      lavaCracks.push(crack);
    }
  }

  // runes — floating squares around the gate
  const runes: THREE.Mesh[] = [];
  const runeCount = compact ? 3 : 6;
  for (let i = 0; i < runeCount; i++) {
    const a = (i / runeCount) * Math.PI * 2;
    const r = 1.4 * s;
    const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.4 * s, 0.4 * s), runeMat);
    rune.position.set(Math.cos(a) * r, 1.5 * s + Math.sin(a * 2) * 0.6 * s, Math.sin(a) * r);
    rune.lookAt(0, rune.position.y, 0);
    root.add(rune);
    runes.push(rune);
  }

  // skull pile — small octahedrons at the base
  if (!compact) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const skull = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3 * s, 0),
        darkRockMat,
      );
      skull.position.set(Math.cos(a) * 2.4 * s, 0.15 * s, Math.sin(a) * 2.4 * s);
      skull.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      root.add(skull);
    }
  }

  const glow = createGroundGlow(0xcc00ff, 7 * s, 0.16);
  glow.position.y = 0.01;
  root.add(glow);

  // particle systems — orange embers + violet void sparks
  const embers = createParticleField({
    count: compact ? 24 : 60,
    color: '#ff6600',
    size: 0.14 * s,
    spread: 3.0 * s,
    velocity: new THREE.Vector3(0, 0.55, 0),
    jitter: 0.4,
    lifespan: [1.0, 2.5],
    spawnRadius: 1.2 * s,
  });
  embers.points.position.y = 0.4 * s;
  root.add(embers.points);

  const voidSparks = createParticleField({
    count: compact ? 8 : 20,
    color: '#cc00ff',
    size: 0.12 * s,
    spread: 2.0 * s,
    velocity: new THREE.Vector3(0, 0, 0),
    jitter: 0.7,
    lifespan: [0.3, 0.6],
    spawnRadius: 0.8 * s,
  });
  voidSparks.points.position.y = 2.5 * s;
  root.add(voidSparks.points);

  const voidLight = new THREE.PointLight(0xcc00ff, RACE_LIGHT_INTENSITY[Race.SEYTAN] * 1.1 * (compact ? 0.5 : 1), 16, 1.6);
  voidLight.position.set(0, 2.0 * s, 0);
  root.add(voidLight);

  const lavaLight = new THREE.PointLight(0xff2200, 1.2 * (compact ? 0.5 : 1), 6, 1.6);
  lavaLight.position.set(0, 0.2 * s, 0);
  root.add(lavaLight);

  let selected = false;

  const update = (elapsed: number, dt: number) => {
    voidPortal.rotation.z += 0.005;
    runes.forEach((r, i) => {
      (r.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(elapsed * 2 + i * 0.8) * 0.3;
    });
    gateTop.rotation.z = Math.sin(elapsed * 0.5) * 0.02;

    if (selected) {
      const openScale = 1 + Math.sin(elapsed * 2) * 0.08;
      voidPortal.scale.set(openScale, openScale, 1);
      voidPortalMat.opacity = 0.85 + Math.sin(elapsed * 4) * 0.1;
      lavaMat.emissiveIntensity = 2.5 + Math.sin(elapsed * 5) * 0.8;
    } else {
      voidPortal.scale.set(1, 1, 1);
      voidPortalMat.opacity = 0.85;
      lavaMat.emissiveIntensity = baseLavaEmissive + Math.sin(elapsed * 1.8) * 0.6;
    }

    embers.update(dt);
    voidSparks.update(dt);
  };

  const setSelected = (v: boolean) => { selected = v; };

  const dispose = () => {
    disposeGroup(root);
    embers.dispose();
    voidSparks.dispose();
  };

  return { group: root, radius: 3.0 * s, update, setSelected, dispose };
};
