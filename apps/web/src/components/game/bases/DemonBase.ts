import * as THREE from 'three';
import { Race } from '@/types/units';
import { createParticleField } from './particles';
import type { RaceBaseFactory } from './types';
import { RACE_LIGHT_INTENSITY } from './types';

/**
 * Şeytan — Cehennem Kapısı
 * Octahedron temel + dönen mor portal halkası + 4 sivri dikit + kıvılcım partikülleri.
 */
export const createDemonBase: RaceBaseFactory = (color, opts) => {
  const compact = !!opts.compact;
  const scale = compact ? 0.55 : 1;
  const root = new THREE.Group();

  const obsidian = '#0a0612';

  // ── Temel — siyah octahedron ──────────────────────────────────────────
  const baseGeom = new THREE.OctahedronGeometry(1.1 * scale, 0);
  const baseMat = new THREE.MeshStandardMaterial({
    color: obsidian,
    roughness: 0.1,
    metalness: 0.85,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.18,
  });
  const baseMesh = new THREE.Mesh(baseGeom, baseMat);
  baseMesh.position.y = 1.1 * scale;
  root.add(baseMesh);

  // ── Portal halkası ────────────────────────────────────────────────────
  const portalGeom = new THREE.TorusGeometry(1.5 * scale, 0.12 * scale, 12, 48);
  const portalMat = new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: 1.4,
    roughness: 0.3,
    metalness: 0.4,
  });
  const portal = new THREE.Mesh(portalGeom, portalMat);
  portal.position.y = 1.5 * scale;
  root.add(portal);

  // İçindeki void disk
  const voidGeom = new THREE.CircleGeometry(1.4 * scale, 36);
  const voidMat = new THREE.MeshBasicMaterial({
    color: '#1a0824',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const voidDisk = new THREE.Mesh(voidGeom, voidMat);
  voidDisk.position.copy(portal.position);
  root.add(voidDisk);

  // ── Sivri dikitler (4 kone) ───────────────────────────────────────────
  const spikes: THREE.Mesh[] = [];
  const spikeCount = compact ? 2 : 4;
  for (let i = 0; i < spikeCount; i++) {
    const a = (i / spikeCount) * Math.PI * 2;
    const g = new THREE.ConeGeometry(0.22 * scale, 1.4 * scale, 10);
    const m = new THREE.MeshStandardMaterial({
      color: obsidian,
      roughness: 0.2,
      metalness: 0.7,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.3,
    });
    const spike = new THREE.Mesh(g, m);
    spike.position.set(Math.cos(a) * 1.7 * scale, 0.8 * scale, Math.sin(a) * 1.7 * scale);
    root.add(spike);
    spikes.push(spike);
  }

  // ── Kıvılcım partikülleri ─────────────────────────────────────────────
  const sparks = createParticleField({
    count: compact ? 16 : 50,
    color: '#ff66ff',
    size: 0.16 * scale,
    spread: 3.0 * scale,
    velocity: new THREE.Vector3(0, 0.6, 0),
    jitter: 0.5,
    lifespan: [1.2, 2.4],
    spawnRadius: 1.5 * scale,
  });
  sparks.points.position.y = 0.4 * scale;
  root.add(sparks.points);

  // ── Aksan ışığı ───────────────────────────────────────────────────────
  const light = new THREE.PointLight(color, RACE_LIGHT_INTENSITY[Race.SEYTAN] * (compact ? 0.5 : 1), 26, 1.6);
  light.position.set(0, 1.5 * scale, 0);
  root.add(light);

  const update = (elapsed: number, dt: number) => {
    portal.rotation.z += dt * 0.9;
    voidDisk.rotation.z = -portal.rotation.z * 0.6;
    baseMesh.rotation.y += dt * 0.25;
    // Spikes hover slightly
    spikes.forEach((s, i) => {
      s.position.y = 0.8 * scale + Math.sin(elapsed * 1.2 + i) * 0.06 * scale;
    });
    sparks.update(dt);
  };

  const dispose = () => {
    baseGeom.dispose(); baseMat.dispose();
    portalGeom.dispose(); portalMat.dispose();
    voidGeom.dispose(); voidMat.dispose();
    spikes.forEach(s => {
      (s.geometry as THREE.BufferGeometry).dispose();
      (s.material as THREE.Material).dispose();
    });
    sparks.dispose();
  };

  return { group: root, radius: 2.0 * scale, update, dispose };
};
