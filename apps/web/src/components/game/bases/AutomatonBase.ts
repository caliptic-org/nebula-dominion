import * as THREE from 'three';
import { Race } from '@/types/units';
import type { RaceBaseFactory } from './types';
import { RACE_LIGHT_INTENSITY } from './types';

/**
 * Otomat — Kronos Fabrikası
 * Geniş chrome platform + reaktör küresi + dönen dişliler.
 */
export const createAutomatonBase: RaceBaseFactory = (color, opts) => {
  const compact = !!opts.compact;
  const scale = compact ? 0.55 : 1;
  const root = new THREE.Group();

  // ── Platform ──────────────────────────────────────────────────────────
  const platformGeom = new THREE.BoxGeometry(3.8 * scale, 0.45 * scale, 3.8 * scale);
  const platformMat = new THREE.MeshStandardMaterial({
    color: '#7a8794',
    roughness: 0.25,
    metalness: 0.9,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.08,
  });
  const platform = new THREE.Mesh(platformGeom, platformMat);
  platform.position.y = 0.22 * scale;
  root.add(platform);

  // Bordür ışıkları — ince emissive çizgi
  const trimGeom = new THREE.BoxGeometry(3.85 * scale, 0.05 * scale, 3.85 * scale);
  const trimMat = new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: 1.6,
    roughness: 0.6,
  });
  const trim = new THREE.Mesh(trimGeom, trimMat);
  trim.position.y = 0.45 * scale;
  root.add(trim);

  // ── Merkez reaktör ────────────────────────────────────────────────────
  const reactorShellGeom = new THREE.CylinderGeometry(0.85 * scale, 0.95 * scale, 1.4 * scale, 20, 1, true);
  const reactorShellMat = new THREE.MeshStandardMaterial({
    color: '#9aa6b4',
    roughness: 0.2,
    metalness: 0.95,
    side: THREE.DoubleSide,
  });
  const reactorShell = new THREE.Mesh(reactorShellGeom, reactorShellMat);
  reactorShell.position.y = 1.15 * scale;
  root.add(reactorShell);

  const coreGeom = new THREE.SphereGeometry(0.55 * scale, 24, 18);
  const coreMat = new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: 1.4,
    roughness: 0.1,
    metalness: 0.0,
  });
  const core = new THREE.Mesh(coreGeom, coreMat);
  core.position.y = 1.15 * scale;
  root.add(core);

  // ── Dönen dişliler (Torus) — farklı hızlarda ──────────────────────────
  const gears: { mesh: THREE.Mesh; speed: number; axis: THREE.Vector3 }[] = [];
  const gearSpecs = [
    { r: 1.1, t: 0.12, y: 0.6, axis: new THREE.Vector3(0, 1, 0), speed: 0.6 },
    { r: 1.4, t: 0.08, y: 1.15, axis: new THREE.Vector3(0, 1, 0), speed: -0.4 },
    { r: 0.85, t: 0.10, y: 1.7, axis: new THREE.Vector3(0, 1, 0), speed: 0.9 },
  ];
  if (compact) gearSpecs.length = 1; // tek dişli yeter
  gearSpecs.forEach(s => {
    const g = new THREE.TorusGeometry(s.r * scale, s.t * scale, 10, 32);
    const m = new THREE.MeshStandardMaterial({
      color: '#a8b3c2',
      roughness: 0.2,
      metalness: 1.0,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.25,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = s.y * scale;
    root.add(mesh);
    gears.push({ mesh, speed: s.speed, axis: s.axis });
  });

  // ── Aksan ışığı ───────────────────────────────────────────────────────
  const light = new THREE.PointLight(color, RACE_LIGHT_INTENSITY[Race.OTOMAT] * (compact ? 0.5 : 1), 24, 1.6);
  light.position.set(0, 1.2 * scale, 0);
  root.add(light);

  const update = (elapsed: number, dt: number) => {
    gears.forEach(g => {
      // Torus kendi düzleminde döner — z-rotation çevirilmiş hali için y'i kullan
      g.mesh.rotation.z += dt * g.speed;
    });
    // Reaktör pulsar
    const pulse = 1.0 + 0.18 * Math.sin(elapsed * 2.4);
    core.scale.setScalar(pulse);
    coreMat.emissiveIntensity = 1.1 + 0.6 * Math.sin(elapsed * 2.4);
  };

  const dispose = () => {
    platformGeom.dispose(); platformMat.dispose();
    trimGeom.dispose(); trimMat.dispose();
    reactorShellGeom.dispose(); reactorShellMat.dispose();
    coreGeom.dispose(); coreMat.dispose();
    gears.forEach(g => {
      (g.mesh.geometry as THREE.BufferGeometry).dispose();
      (g.mesh.material as THREE.Material).dispose();
    });
  };

  return { group: root, radius: 2.2 * scale, update, dispose };
};
