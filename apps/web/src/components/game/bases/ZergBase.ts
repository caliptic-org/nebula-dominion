import * as THREE from 'three';
import { Race } from '@/types/units';
import { createParticleField } from './particles';
import type { RaceBaseFactory } from './types';
import { RACE_LIGHT_INTENSITY } from './types';

/**
 * Böcek (Zerg) — Kovan Yeraltısı
 * Organik tünel girişi (cylinder) + nabız atan damarlar (tube) + asit havuzu (circle).
 */
export const createZergBase: RaceBaseFactory = (color, opts) => {
  const compact = !!opts.compact;
  const scale = compact ? 0.55 : 1;
  const root = new THREE.Group();

  const chitin = '#1f3320';
  const acidGreen = new THREE.Color(color);

  // ── Asit havuzu — yeşil emissive zemin ────────────────────────────────
  const poolGeom = new THREE.CircleGeometry(1.7 * scale, 36);
  const poolMat = new THREE.MeshStandardMaterial({
    color: '#9eff9e',
    emissive: acidGreen,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.7,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });
  const pool = new THREE.Mesh(poolGeom, poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.02 * scale;
  root.add(pool);

  // ── Tünel girişi — cylinder, organik açık uç ──────────────────────────
  const tunnelGeom = new THREE.CylinderGeometry(0.95 * scale, 1.4 * scale, 1.8 * scale, 18, 1, true);
  const tunnelMat = new THREE.MeshStandardMaterial({
    color: chitin,
    roughness: 0.9,
    metalness: 0.1,
    emissive: acidGreen,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
  });
  const tunnel = new THREE.Mesh(tunnelGeom, tunnelMat);
  tunnel.position.y = 0.95 * scale;
  root.add(tunnel);

  // ── Damarlar (tube) — nabız animasyonu için scale.y kullanılacak ──────
  const veins: THREE.Mesh[] = [];
  const veinCount = compact ? 3 : 6;
  for (let i = 0; i < veinCount; i++) {
    const a = (i / veinCount) * Math.PI * 2;
    const x0 = Math.cos(a) * 1.0 * scale, z0 = Math.sin(a) * 1.0 * scale;
    const x1 = Math.cos(a) * 1.5 * scale, z1 = Math.sin(a) * 1.5 * scale;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x0, 0.05 * scale, z0),
      new THREE.Vector3((x0 + x1) / 2, 0.6 * scale, (z0 + z1) / 2),
      new THREE.Vector3(x1, 1.1 * scale, z1),
      new THREE.Vector3(x1 * 0.9, 1.7 * scale, z1 * 0.9),
    ]);
    const g = new THREE.TubeGeometry(curve, 18, 0.07 * scale, 8, false);
    const m = new THREE.MeshStandardMaterial({
      color: '#3a5a30',
      emissive: acidGreen,
      emissiveIntensity: 0.55,
      roughness: 0.7,
    });
    const vein = new THREE.Mesh(g, m);
    root.add(vein);
    veins.push(vein);
  }

  // ── Asit damla partikülleri ───────────────────────────────────────────
  const drips = createParticleField({
    count: compact ? 12 : 36,
    color: '#aaff77',
    size: 0.14 * scale,
    spread: 2.4 * scale,
    velocity: new THREE.Vector3(0, -0.35, 0),
    jitter: 0.18,
    lifespan: [1.5, 3.0],
    spawnRadius: 1.2 * scale,
  });
  drips.points.position.y = 1.6 * scale;
  root.add(drips.points);

  // ── Aksan ışığı ───────────────────────────────────────────────────────
  const light = new THREE.PointLight(color, RACE_LIGHT_INTENSITY[Race.ZERG] * (compact ? 0.5 : 1), 20, 1.6);
  light.position.set(0, 0.6 * scale, 0);
  root.add(light);

  const update = (elapsed: number, dt: number) => {
    // Damarlar nabız atar (scale.y)
    const pulse = 1.0 + 0.16 * Math.sin(elapsed * 2.0);
    veins.forEach(v => { v.scale.y = pulse; });
    // Asit havuzu emissive titremesi
    poolMat.emissiveIntensity = 0.7 + 0.3 * Math.sin(elapsed * 1.6);
    drips.update(dt);
  };

  const dispose = () => {
    poolGeom.dispose(); poolMat.dispose();
    tunnelGeom.dispose(); tunnelMat.dispose();
    veins.forEach(v => {
      (v.geometry as THREE.BufferGeometry).dispose();
      (v.material as THREE.Material).dispose();
    });
    drips.dispose();
  };

  return { group: root, radius: 2.0 * scale, update, dispose };
};
