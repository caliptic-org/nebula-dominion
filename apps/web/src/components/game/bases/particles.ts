import * as THREE from 'three';

export interface ParticleField {
  points: THREE.Points;
  update: (dt: number) => void;
  dispose: () => void;
}

interface ParticleConfig {
  count: number;
  color: string;
  size: number;
  /** Spawn region size around origin. */
  spread: number;
  /** Drift direction & speed in world units per second. */
  velocity: THREE.Vector3;
  /** Random jitter on velocity per particle. */
  jitter: number;
  /** Lifespan range in seconds (random per particle). */
  lifespan: [number, number];
  /** Optional: respawn radially around origin. */
  spawnRadius?: number;
}

/**
 * Lightweight CPU-driven particle field. Each particle ages, drifts, and respawns —
 * cheap enough to run a few of these per scene without instancing pressure.
 */
export function createParticleField(cfg: ParticleConfig): ParticleField {
  const positions = new Float32Array(cfg.count * 3);
  const velocities = new Float32Array(cfg.count * 3);
  const ages = new Float32Array(cfg.count);
  const lives = new Float32Array(cfg.count);

  const respawn = (i: number) => {
    if (cfg.spawnRadius != null) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * cfg.spawnRadius;
      positions[i*3+0] = Math.cos(a) * r;
      positions[i*3+1] = (Math.random() - 0.5) * cfg.spread * 0.5;
      positions[i*3+2] = Math.sin(a) * r;
    } else {
      positions[i*3+0] = (Math.random() - 0.5) * cfg.spread;
      positions[i*3+1] = (Math.random() - 0.5) * cfg.spread;
      positions[i*3+2] = (Math.random() - 0.5) * cfg.spread;
    }
    velocities[i*3+0] = cfg.velocity.x + (Math.random() - 0.5) * cfg.jitter;
    velocities[i*3+1] = cfg.velocity.y + (Math.random() - 0.5) * cfg.jitter;
    velocities[i*3+2] = cfg.velocity.z + (Math.random() - 0.5) * cfg.jitter;
    ages[i] = 0;
    lives[i] = cfg.lifespan[0] + Math.random() * (cfg.lifespan[1] - cfg.lifespan[0]);
  };

  for (let i = 0; i < cfg.count; i++) {
    respawn(i);
    ages[i] = Math.random() * lives[i]; // stagger initial ages so they don't all respawn together
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const tex = makePointTexture(cfg.color);
  const mat = new THREE.PointsMaterial({
    color: cfg.color,
    size: cfg.size,
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geom, mat);
  points.frustumCulled = false;

  const update = (dt: number) => {
    for (let i = 0; i < cfg.count; i++) {
      ages[i] += dt;
      if (ages[i] >= lives[i]) {
        respawn(i);
        continue;
      }
      positions[i*3+0] += velocities[i*3+0] * dt;
      positions[i*3+1] += velocities[i*3+1] * dt;
      positions[i*3+2] += velocities[i*3+2] * dt;
    }
    geom.attributes.position.needsUpdate = true;
  };

  const dispose = () => {
    geom.dispose();
    mat.dispose();
    tex.dispose();
  };

  return { points, update, dispose };
}

/**
 * Ground glow plane — additive blend disc that sits flat at y=0 to fake bloom on the floor.
 * Each race uses one of these tinted to its accent color. Disposal is the caller's job.
 */
export function createGroundGlow(color: THREE.ColorRepresentation, size: number, opacity = 0.15): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(size, size);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/**
 * Walks a group and disposes every geometry/material it owns. Use in factory `dispose`
 * to avoid hand-tracking each mesh — the host already removes the root from the scene.
 */
export function disposeGroup(root: THREE.Object3D): void {
  const seenGeoms = new Set<THREE.BufferGeometry>();
  const seenMats = new Set<THREE.Material>();
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && !seenGeoms.has(mesh.geometry)) {
      seenGeoms.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
    mats.forEach(m => {
      if (!seenMats.has(m)) { seenMats.add(m); m.dispose(); }
    });
  });
}

function makePointTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  const col = new THREE.Color(color);
  const r = Math.round(col.r * 255), gg = Math.round(col.g * 255), b = Math.round(col.b * 255);
  g.addColorStop(0,   `rgba(${r},${gg},${b},1)`);
  g.addColorStop(0.5, `rgba(${r},${gg},${b},0.45)`);
  g.addColorStop(1,   `rgba(${r},${gg},${b},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
