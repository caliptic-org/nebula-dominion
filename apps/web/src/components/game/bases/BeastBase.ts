import * as THREE from 'three';
import { Race } from '@/types/units';
import { createParticleField } from './particles';
import type { RaceBaseFactory } from './types';
import { RACE_LIGHT_INTENSITY } from './types';

/**
 * Canavar — Titan Mağarası
 * Yassılaştırılmış torus kemer + ters konik stalaktitler + dodecahedron lav zemin.
 */
export const createBeastBase: RaceBaseFactory = (color, opts) => {
  const compact = !!opts.compact;
  const scale = compact ? 0.55 : 1;
  const root = new THREE.Group();

  const stoneTan = '#3b2a1f';
  const boneCream = '#d8c8a8';
  const lavaOrange = new THREE.Color(color);

  // ── Mağara giriş kemeri (yassılaştırılmış torus) ──────────────────────
  const archGeom = new THREE.TorusGeometry(1.8 * scale, 0.45 * scale, 14, 32, Math.PI);
  const archMat = new THREE.MeshStandardMaterial({
    color: stoneTan,
    roughness: 1.0,
    metalness: 0.05,
    emissive: lavaOrange,
    emissiveIntensity: 0.12,
  });
  const arch = new THREE.Mesh(archGeom, archMat);
  arch.scale.set(1, 1, 0.55); // yassılaştır
  arch.position.y = 0.4 * scale;
  arch.rotation.z = Math.PI; // ağzı aşağı
  root.add(arch);

  // ── Stalaktitler — ters koniler ───────────────────────────────────────
  const stalactites: THREE.Mesh[] = [];
  const stCount = compact ? 4 : 7;
  for (let i = 0; i < stCount; i++) {
    const t = i / (stCount - 1);
    const angle = -Math.PI * (0.15 + t * 0.7); // kemerin alt kısmında dizilim
    const r = 1.65 * scale;
    const len = (0.4 + Math.random() * 0.6) * scale;
    const g = new THREE.ConeGeometry(0.13 * scale, len, 8);
    const m = new THREE.MeshStandardMaterial({
      color: boneCream,
      roughness: 0.85,
      metalness: 0.05,
    });
    const cone = new THREE.Mesh(g, m);
    cone.position.set(Math.cos(angle) * r, Math.sin(angle) * r + 0.4 * scale, 0);
    cone.rotation.z = Math.PI; // sivri uç aşağı
    root.add(cone);
    stalactites.push(cone);
  }

  // ── Lav zemin — dodecahedron parçaları ────────────────────────────────
  const groundGeom = new THREE.DodecahedronGeometry(1.6 * scale, 0);
  const groundMat = new THREE.MeshStandardMaterial({
    color: '#241712',
    roughness: 0.95,
    metalness: 0.0,
    emissive: lavaOrange,
    emissiveIntensity: 0.45,
    flatShading: true,
  });
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.scale.set(1, 0.45, 1);
  ground.position.y = -0.05 * scale;
  root.add(ground);

  // ── Lav damla partikülleri (aşağı akar) ───────────────────────────────
  const lava = createParticleField({
    count: compact ? 14 : 40,
    color: '#ff8c33',
    size: 0.18 * scale,
    spread: 2.6 * scale,
    velocity: new THREE.Vector3(0, -0.45, 0),
    jitter: 0.15,
    lifespan: [1.2, 2.5],
    spawnRadius: 1.4 * scale,
  });
  lava.points.position.y = 1.4 * scale;
  root.add(lava.points);

  // ── Aksan ışığı ───────────────────────────────────────────────────────
  const light = new THREE.PointLight(color, RACE_LIGHT_INTENSITY[Race.CANAVAR] * (compact ? 0.5 : 1), 22, 1.6);
  light.position.set(0, 0.8 * scale, 0);
  root.add(light);

  const update = (elapsed: number, dt: number) => {
    // Lava çatlakları "nefes" alır
    groundMat.emissiveIntensity = 0.35 + 0.2 * Math.sin(elapsed * 1.3);
    // Stalaktitler hafifçe sarkar
    stalactites.forEach((s, i) => {
      s.position.y += Math.sin(elapsed * 0.5 + i * 0.7) * 0.0008;
    });
    lava.update(dt);
  };

  const dispose = () => {
    archGeom.dispose(); archMat.dispose();
    groundGeom.dispose(); groundMat.dispose();
    stalactites.forEach(s => {
      (s.geometry as THREE.BufferGeometry).dispose();
      (s.material as THREE.Material).dispose();
    });
    lava.dispose();
  };

  return { group: root, radius: 2.2 * scale, update, dispose };
};
