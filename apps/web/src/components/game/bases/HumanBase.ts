import * as THREE from 'three';
import { Race } from '@/types/units';
import { createParticleField } from './particles';
import type { RaceBaseFactory } from './types';
import { RACE_LIGHT_INTENSITY } from './types';

/**
 * İnsan — Yıldız Düşüşü Sarayı
 * Beyaz/gümüş merkez kule + 4 yan kule + altın koni çatı, altın yıldız tozu partikülleri.
 */
export const createHumanBase: RaceBaseFactory = (color, opts) => {
  const compact = !!opts.compact;
  const scale = compact ? 0.55 : 1;
  const root = new THREE.Group();

  const palaceWhite = '#f1f5ff';
  const goldEmissive = new THREE.Color('#ffd166');

  // ── Merkez kule ───────────────────────────────────────────────────────
  const towerGeom = new THREE.CylinderGeometry(0.55 * scale, 0.65 * scale, 3.2 * scale, 18);
  const towerMat = new THREE.MeshStandardMaterial({
    color: palaceWhite,
    roughness: 0.18,
    metalness: 0.55,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.18,
  });
  const tower = new THREE.Mesh(towerGeom, towerMat);
  tower.position.y = 1.6 * scale;
  root.add(tower);

  // Altın koni çatı
  const roofGeom = new THREE.ConeGeometry(0.7 * scale, 1.0 * scale, 18);
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#fff0b6',
    roughness: 0.25,
    metalness: 0.85,
    emissive: goldEmissive,
    emissiveIntensity: 0.6,
  });
  const roof = new THREE.Mesh(roofGeom, roofMat);
  roof.position.y = 3.7 * scale;
  root.add(roof);

  // ── Yan kuleler (4 adet) ──────────────────────────────────────────────
  const sideTowers: THREE.Mesh[] = [];
  if (!compact) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const sideGeom = new THREE.CylinderGeometry(0.22 * scale, 0.28 * scale, 2.0 * scale, 12);
      const side = new THREE.Mesh(sideGeom, towerMat);
      side.position.set(Math.cos(a) * 1.3 * scale, 1.0 * scale, Math.sin(a) * 1.3 * scale);
      const capGeom = new THREE.ConeGeometry(0.32 * scale, 0.55 * scale, 14);
      const cap = new THREE.Mesh(capGeom, roofMat);
      cap.position.y = 1.3 * scale;
      side.add(cap);
      root.add(side);
      sideTowers.push(side);
    }
  }

  // Yüzen platform — sarayın havada durduğunu hissettiren halka
  const platformGeom = new THREE.CylinderGeometry(1.5 * scale, 1.7 * scale, 0.18 * scale, 24);
  const platformMat = new THREE.MeshStandardMaterial({
    color: palaceWhite,
    roughness: 0.4,
    metalness: 0.3,
  });
  const platform = new THREE.Mesh(platformGeom, platformMat);
  platform.position.y = -0.05 * scale;
  root.add(platform);

  // ── Partiküller — altın yıldız tozu ───────────────────────────────────
  const particles = createParticleField({
    count: compact ? 18 : 60,
    color: '#ffd166',
    size: 0.18 * scale,
    spread: 4.2 * scale,
    velocity: new THREE.Vector3(0, 0.3, 0),
    jitter: 0.25,
    lifespan: [2.0, 4.5],
    spawnRadius: 1.8 * scale,
  });
  particles.points.position.y = 1.0 * scale;
  root.add(particles.points);

  // ── Aksan ışığı ───────────────────────────────────────────────────────
  const light = new THREE.PointLight(color, RACE_LIGHT_INTENSITY[Race.INSAN] * (compact ? 0.5 : 1), 22, 1.6);
  light.position.set(0, 2.2 * scale, 0);
  root.add(light);

  const update = (elapsed: number, _dt: number) => {
    // Çok yavaş kendi ekseni etrafında dönüş
    root.rotation.y += 0.0025;
    // Yan kuleler küçük bir y-bobu yapar
    sideTowers.forEach((s, i) => {
      s.position.y = 1.0 * scale + Math.sin(elapsed * 0.6 + i) * 0.08 * scale;
    });
    particles.update(_dt);
  };

  const dispose = () => {
    towerGeom.dispose();
    towerMat.dispose();
    roofGeom.dispose();
    roofMat.dispose();
    platformGeom.dispose();
    platformMat.dispose();
    sideTowers.forEach(s => {
      (s.geometry as THREE.BufferGeometry).dispose();
      s.children.forEach(c => {
        const m = c as THREE.Mesh;
        m.geometry?.dispose?.();
      });
    });
    particles.dispose();
  };

  return { group: root, radius: 2.2 * scale, update, dispose };
};
