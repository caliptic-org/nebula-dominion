'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Race } from '@/types/units';
import type {
  WorldMapHandle,
  WorldMapProps,
  WorldBase,
  WorldResource,
  WorldEnemy,
  HitTarget,
  TerritoryZone,
} from './WorldMap';
import { createRaceBase, createInstancedBaseField, type RaceBaseInstance } from './bases';
import { loadEnemySprite, loadResourceSprite, preloadSprites } from './bases/spriteLoader';

// When the base count exceeds this threshold, fall back to InstancedMesh silhouettes
// instead of full procedural geometry per base.
const INSTANCING_THRESHOLD = 50;

// ── Layout constants ───────────────────────────────────────────────────────
const COLS              = 26;       // matches WorldMap seed grid for col→sphere mapping
const ROWS              = 20;
const SPHERE_RADIUS     = 28;       // base radius for enemy/resource placement
const STAR_RADIUS       = 240;      // star skybox radius
const STAR_COUNT        = 12000;
const NEBULA_RADII      = [110, 150, 195] as const;
const CAM_INIT_POS      = new THREE.Vector3(0, 18, 70);
const CAM_MIN_DIST      = 8;
const CAM_MAX_DIST      = 130;

// ── Race colors ─────────────────────────────────────────────────────────────
const RACE_COL: Record<Race, string> = {
  [Race.INSAN]:   '#4a9eff',
  [Race.ZERG]:    '#44ff44',
  [Race.OTOMAT]:  '#00cfff',
  [Race.CANAVAR]: '#ff6600',
  [Race.SEYTAN]:  '#cc00ff',
};
const RES_COL: Record<WorldResource['kind'], string> = {
  mineral: '#4a9eff',
  gas:     '#44ff88',
  energy:  '#ffc832',
};

// ── Seed fallbacks (mirror WorldMap so the page renders standalone) ────────
function makeBases(playerRace: Race): WorldBase[] {
  return [
    { id:'player',    col:13, row:10, race:playerRace,   name:'Ana Üssün',       level:7, power:4800, isPlayer:true },
    { id:'zerg-1',    col:3,  row:3,  race:Race.ZERG,    name:'Kovan Kalbi',     level:5, power:3200 },
    { id:'otomat-1',  col:22, row:3,  race:Race.OTOMAT,  name:'Prime Hub',       level:6, power:4100 },
    { id:'canavar-1', col:3,  row:17, race:Race.CANAVAR, name:'Ateş Kalesi',     level:4, power:2700 },
    { id:'seytan-1',  col:22, row:16, race:Race.SEYTAN,  name:'Lanet Kulesi',    level:6, power:3900 },
    { id:'insan-1',   col:13, row:3,  race:Race.INSAN,   name:'Kuzey Garnizon',  level:3, power:1800 },
    { id:'neutral-1', col:7,  row:10, race:Race.CANAVAR, name:'Yıkılmış Kale',   level:2, power:900 },
    { id:'neutral-2', col:19, row:11, race:Race.ZERG,    name:'Kovan Çıkıntısı', level:3, power:1200 },
  ];
}
function makeResources(): WorldResource[] {
  const seed: Array<[number,number,'mineral'|'gas'|'energy']> = [
    [8,5,'mineral'],[16,5,'mineral'],[5,11,'gas'],[11,7,'energy'],
    [17,8,'mineral'],[9,14,'gas'],[15,14,'energy'],[20,8,'gas'],
    [7,7,'mineral'],[11,14,'mineral'],[19,6,'energy'],[4,8,'energy'],
    [22,10,'mineral'],[13,16,'gas'],[6,15,'energy'],[20,14,'mineral'],
    [8,17,'gas'],[16,16,'energy'],
  ];
  return seed.map(([col,row,kind],i) => ({ id:`res-${i}`, col, row, kind, amount:500+i*180 }));
}
function makeEnemies(): WorldEnemy[] {
  const patrols: Array<[Race,Array<[number,number]>]> = [
    [Race.ZERG,    [[10,5],[12,6],[11,8],[9,7],[10,5]]],
    [Race.CANAVAR, [[7,12],[10,13],[9,15],[7,14],[7,12]]],
    [Race.SEYTAN,  [[17,5],[19,7],[18,9],[16,8],[17,5]]],
    [Race.OTOMAT,  [[15,11],[17,12],[16,14],[14,13],[15,11]]],
  ];
  return patrols.map(([race,path],i) => ({
    id:`enemy-${i}`, col:path[0][0], row:path[0][1],
    race, power:300+i*250,
    fcol:path[0][0], frow:path[0][1],
    targetCol:path[1][0], targetRow:path[1][1],
    progress:i*0.18, patrolPath:path, pathIdx:0,
  }));
}

// ── Coordinate mapping ─────────────────────────────────────────────────────
// Map a (col,row) grid coord onto the inside surface of the play sphere.
// Player base sits at the origin; enemies/resources orbit around it.
function gridToSphere(col: number, row: number, radius = SPHERE_RADIUS): THREE.Vector3 {
  const theta = (col / COLS) * Math.PI * 2;       // azimuth
  const phi   = ((row + 0.5) / ROWS) * Math.PI;   // polar — keep off the poles
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// ── StarField — 12k+ animated points on a far skybox ──────────────────────
function createStarField(): THREE.Points {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes     = new Float32Array(STAR_COUNT);
  const phases    = new Float32Array(STAR_COUNT);
  const colors    = new Float32Array(STAR_COUNT * 3);

  // Mild palette: cool whites + a few warm accents
  const palette = [
    new THREE.Color('#ffffff'), new THREE.Color('#cfd9ff'),
    new THREE.Color('#fff3c2'), new THREE.Color('#a8c4ff'),
    new THREE.Color('#ffd6a8'),
  ];

  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform on sphere
    const u = Math.random(), v = Math.random();
    const theta = u * Math.PI * 2;
    const phi   = Math.acos(2 * v - 1);
    const r     = STAR_RADIUS * (0.95 + Math.random() * 0.05);
    positions[i*3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3 + 1] = r * Math.cos(phi);
    positions[i*3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    sizes[i]  = 0.6 + Math.pow(Math.random(), 4) * 4.5;
    phases[i] = Math.random() * Math.PI * 2;

    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i*3+0] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));
  geom.setAttribute('phase',    new THREE.BufferAttribute(phases, 1));
  geom.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: `
      attribute float size;
      attribute float phase;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uTime;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        float twinkle = 0.55 + 0.45 * sin(uTime * 1.6 + phase);
        vAlpha = twinkle;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uPixelRatio * (320.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        if (r > 0.5) discard;
        float falloff = smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(vColor, falloff * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geom, mat);
  points.frustumCulled = false;
  points.userData.material = mat;
  return points;
}

// ── NebulaSphere — nested back-side spheres, race-colored ──────────────────
function createNebula(raceColor: string): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Color(raceColor);

  NEBULA_RADII.forEach((radius, i) => {
    const geom = new THREE.SphereGeometry(radius, 48, 32);
    // Tinted toward race color with depth — outer layers are deeper
    const tint = base.clone().lerp(new THREE.Color('#0a0820'), 0.55 + i * 0.12);
    const mat = new THREE.MeshBasicMaterial({
      color: tint,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.10 - i * 0.02,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData.spin = (i % 2 === 0 ? 1 : -1) * 0.0006 * (i + 1);
    group.add(mesh);
  });

  // A faint dust-cloud ring inside the play sphere for atmosphere
  const dustGeom = new THREE.SphereGeometry(SPHERE_RADIUS * 1.6, 32, 24);
  const dustMat = new THREE.MeshBasicMaterial({
    color: base.clone().lerp(new THREE.Color('#000000'), 0.35),
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.05,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Mesh(dustGeom, dustMat);
  dust.userData.spin = 0.0009;
  group.add(dust);

  return group;
}

// ── Map objects (bases, resources, enemies) ────────────────────────────────
interface MapObject {
  kind: 'base' | 'resource' | 'enemy';
  obj: THREE.Object3D;            // root (scaled for hit-testing)
  body: THREE.Mesh;               // visible body (used for raycasting reference)
  glow?: THREE.Sprite;            // halo
  ring?: THREE.Mesh;              // selection ring
  base?: WorldBase;
  resource?: WorldResource;
  enemy?: WorldEnemy;
  basePosition: THREE.Vector3;    // pre-jitter target position
  bobPhase: number;
  /** Race-specific procedural base (player + opponent) — owns its own sub-animation. */
  raceBase?: RaceBaseInstance;
  /** Sprite billboard (enemy/resource) — null when CAL-338 PNG hasn't loaded yet. */
  spriteBillboard?: THREE.Sprite;
}

function makeGlowSprite(color: string, size: number): THREE.Sprite {
  // Procedural radial gradient texture
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  const col = new THREE.Color(color);
  const r = Math.round(col.r * 255), gg = Math.round(col.g * 255), b = Math.round(col.b * 255);
  g.addColorStop(0,   `rgba(${r},${gg},${b},1)`);
  g.addColorStop(0.4, `rgba(${r},${gg},${b},0.45)`);
  g.addColorStop(1,   `rgba(${r},${gg},${b},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

function createBaseObject(b: WorldBase): MapObject {
  const color = RACE_COL[b.race];
  const root = new THREE.Group();

  // ── Race-specific procedural geometry ─────────────────────────────────
  const raceBase = createRaceBase(b.race, { compact: !b.isPlayer, level: b.level, isPlayer: b.isPlayer });
  // All meshes inside the race base delegate hit-tests to the root group.
  raceBase.group.traverse(child => {
    if ((child as THREE.Mesh).isMesh) child.userData.hitObject = root;
  });
  root.add(raceBase.group);

  // The race-base radius drives selection-ring sizing and bobbing amplitude.
  const radius = raceBase.radius;

  // Reference body for raycaster traversal — first mesh inside the race group.
  let body: THREE.Mesh | null = null;
  raceBase.group.traverse(child => {
    if (body) return;
    if ((child as THREE.Mesh).isMesh) body = child as THREE.Mesh;
  });
  if (!body) body = new THREE.Mesh();

  const glow = makeGlowSprite(color, b.isPlayer ? 14 : 10);
  glow.position.y = radius * 0.6;
  root.add(glow);

  // Soft equator ring for player base
  if (b.isPlayer) {
    const ringGeom = new THREE.RingGeometry(radius * 1.4, radius * 1.6, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color, side: THREE.DoubleSide, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.2;
    root.add(ring);
  }

  // Hidden selection ring (toggled when selected)
  const selGeom = new THREE.RingGeometry(radius * 1.8, radius * 1.95, 64);
  const selMat = new THREE.MeshBasicMaterial({
    color: '#ffffff', side: THREE.DoubleSide, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const selRing = new THREE.Mesh(selGeom, selMat);
  selRing.rotation.x = Math.PI / 2;
  selRing.position.y = -0.4;
  root.add(selRing);

  const pos = b.isPlayer ? new THREE.Vector3(0, 0, 0) : gridToSphere(b.col, b.row);
  root.position.copy(pos);

  return {
    kind: 'base', obj: root, body, glow, ring: selRing, base: b, raceBase,
    basePosition: pos.clone(),
    bobPhase: Math.random() * Math.PI * 2,
  };
}

function createResourceObject(r: WorldResource): MapObject {
  const color = RES_COL[r.kind];
  const root = new THREE.Group();

  // Cluster of small irregular shards (procedural fallback / always visible)
  const cluster = new THREE.Group();
  const shardCount = 4 + (r.id.length % 3);
  for (let i = 0; i < shardCount; i++) {
    const g = new THREE.DodecahedronGeometry(0.55 + Math.random() * 0.4, 0);
    const m = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.55,
      roughness: 0.7,
      metalness: 0.15,
      flatShading: true,
    });
    const shard = new THREE.Mesh(g, m);
    shard.position.set(
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 1.6,
    );
    shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    cluster.add(shard);
  }
  cluster.userData.hitObject = root;
  const body = cluster.children[0] as THREE.Mesh;
  cluster.children.forEach(c => { c.userData.hitObject = root; });
  root.add(cluster);

  const glow = makeGlowSprite(color, 7);
  root.add(glow);

  // CAL-338 sprite — overlay if/when the PNG is available
  let billboard: THREE.Sprite | undefined;
  loadResourceSprite(r.kind).then(tex => {
    if (!tex) return;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.4, 2.4, 1);
    sprite.userData.hitObject = root;
    root.add(sprite);
    billboard = sprite;
    // Sprite supersedes the procedural cluster — fade it down so the PNG reads cleanly.
    cluster.children.forEach(c => {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
      m.opacity = 0.35;
      m.transparent = true;
    });
  });

  const pos = gridToSphere(r.col, r.row, SPHERE_RADIUS * (0.65 + (r.col % 5) * 0.05));
  root.position.copy(pos);

  return {
    kind: 'resource', obj: root, body, glow, resource: r,
    basePosition: pos.clone(),
    bobPhase: Math.random() * Math.PI * 2,
    spriteBillboard: billboard,
  };
}

function createEnemyObject(e: WorldEnemy): MapObject {
  const color = '#ff3344';
  const accent = RACE_COL[e.race];
  const root = new THREE.Group();

  const geom = new THREE.OctahedronGeometry(1.1, 0);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(accent),
    emissiveIntensity: 0.6,
    roughness: 0.55,
    metalness: 0.4,
    flatShading: true,
  });
  const body = new THREE.Mesh(geom, mat);
  body.userData.hitObject = root;
  root.add(body);

  const glow = makeGlowSprite(color, 6);
  root.add(glow);

  // CAL-338 race-themed billboard sprite — fades the procedural body when loaded.
  let billboard: THREE.Sprite | undefined;
  loadEnemySprite(e.race).then(tex => {
    if (!tex) return;
    const sMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(sMat);
    sprite.scale.set(2.6, 2.6, 1);
    sprite.userData.hitObject = root;
    root.add(sprite);
    billboard = sprite;
    mat.opacity = 0.4;
    mat.transparent = true;
  });

  const pos = gridToSphere(e.fcol, e.frow, SPHERE_RADIUS * 0.85);
  root.position.copy(pos);

  return {
    kind: 'enemy', obj: root, body, glow, enemy: e,
    basePosition: pos.clone(),
    bobPhase: Math.random() * Math.PI * 2,
    spriteBillboard: billboard,
  };
}

// ── Component ──────────────────────────────────────────────────────────────
const SphericalMap = forwardRef<WorldMapHandle, WorldMapProps>(function SphericalMap(
  { playerRace, onSelect, className, bases, resources, enemies, territories: _territories },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef     = useRef<THREE.Scene | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef  = useRef<OrbitControls | null>(null);
  const starsRef     = useRef<THREE.Points | null>(null);
  const nebulaRef    = useRef<THREE.Group | null>(null);
  const objectsRef   = useRef<MapObject[]>([]);
  const selectedRef  = useRef<MapObject | null>(null);
  const rafRef       = useRef(0);
  const clockRef     = useRef<THREE.Clock | null>(null);
  const onSelectRef  = useRef(onSelect);

  // Latest data refs (so render loop reads up-to-date props without rebuilding scene every frame)
  const basesRef     = useRef<WorldBase[]>(bases ?? makeBases(playerRace));
  const resRef       = useRef<WorldResource[]>(resources ?? makeResources());
  const enemiesRef   = useRef<WorldEnemy[]>(enemies ?? makeEnemies());
  const playerRaceRef = useRef<Race>(playerRace);

  // Keep the latest onSelect callback without re-binding the canvas listeners
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // ── Scene setup (run once) ────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#04060c');
    scene.fog = new THREE.FogExp2(0x05070d, 0.0035);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / Math.max(container.clientHeight, 1), 0.1, 1000);
    camera.position.copy(CAM_INIT_POS);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width  = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed   = 0.55;
    controls.zoomSpeed     = 0.8;
    controls.panSpeed      = 0.5;
    controls.enablePan     = false;
    controls.minDistance   = CAM_MIN_DIST;
    controls.maxDistance   = CAM_MAX_DIST;
    controls.target.set(0, 0, 0);
    controls.addEventListener('start', () => { renderer.domElement.style.cursor = 'grabbing'; });
    controls.addEventListener('end',   () => { renderer.domElement.style.cursor = 'grab'; });

    // Lights
    scene.add(new THREE.AmbientLight(0xb0c4ff, 0.45));
    const key = new THREE.PointLight(0xffffff, 1.1, 220, 1.2);
    key.position.set(0, 0, 0); // glow from the player base
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8aa3ff, 0.4);
    fill.position.set(40, 50, 30);
    scene.add(fill);

    // Stars + Nebula
    const stars = createStarField();
    (stars.userData.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = renderer.getPixelRatio();
    scene.add(stars);

    const nebula = createNebula(RACE_COL[playerRaceRef.current]);
    scene.add(nebula);

    // Pre-warm the CAL-338 sprite cache for races present on the map.
    preloadSprites(Array.from(new Set(basesRef.current.map(b => b.race))));

    // Build map objects (procedural per-base, plus instanced silhouette layer
    // when the crowd exceeds INSTANCING_THRESHOLD).
    const objects: MapObject[] = [
      ...basesRef.current.map(createBaseObject),
      ...resRef.current.map(createResourceObject),
      ...enemiesRef.current.map(createEnemyObject),
    ];
    objects.forEach(o => scene.add(o.obj));

    let instancedField: { groups: THREE.Group; dispose: () => void } | null = null;
    if (basesRef.current.length > INSTANCING_THRESHOLD) {
      instancedField = createInstancedBaseField(
        basesRef.current
          .filter(b => !b.isPlayer)
          .map(b => ({ race: b.race, position: gridToSphere(b.col, b.row), isPlayer: false })),
      );
      scene.add(instancedField.groups);
      // Hide individual procedural opponent bases — we render the cheap silhouettes instead.
      objects.forEach(o => {
        if (o.kind === 'base' && o.base && !o.base.isPlayer) o.obj.visible = false;
      });
    }

    sceneRef.current    = scene;
    cameraRef.current   = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    starsRef.current    = stars;
    nebulaRef.current   = nebula;
    objectsRef.current  = objects;
    clockRef.current    = new THREE.Clock();

    // ── Resize handling ─────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    // ── Pointer / raycaster click handling ─────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0, downY = 0, downT = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX; downY = e.clientY; downT = performance.now();
    };
    const onPointerUp = (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - downX);
      const dy = Math.abs(e.clientY - downY);
      const dt = performance.now() - downT;
      // Treat as click only if pointer barely moved (let drag rotate the camera)
      if (dx > 5 || dy > 5 || dt > 600) return;

      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      ndc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);

      // Only test interactive bodies (skip stars / nebula / ring decorations)
      const hitMeshes: THREE.Object3D[] = [];
      objectsRef.current.forEach(o => {
        o.obj.traverse(child => {
          if ((child as THREE.Mesh).isMesh && child.userData.hitObject) hitMeshes.push(child);
        });
      });
      const hits = raycaster.intersectObjects(hitMeshes, false);
      const root = hits[0]?.object.userData.hitObject as THREE.Object3D | undefined;
      const hit = root ? objectsRef.current.find(o => o.obj === root) ?? null : null;

      setSelected(hit);

      if (!hit) {
        onSelectRef.current?.(null);
        return;
      }

      const target: HitTarget = (() => {
        const screenX = e.clientX, screenY = e.clientY;
        if (hit.kind === 'base' && hit.base) {
          return { kind:'base', col: hit.base.col, row: hit.base.row, screenX, screenY, base: hit.base };
        }
        if (hit.kind === 'resource' && hit.resource) {
          return { kind:'resource', col: hit.resource.col, row: hit.resource.row, screenX, screenY, resource: hit.resource };
        }
        if (hit.kind === 'enemy' && hit.enemy) {
          return { kind:'enemy', col: hit.enemy.col, row: hit.enemy.row, screenX, screenY, enemy: hit.enemy };
        }
        return { kind:'empty', col:0, row:0, screenX, screenY };
      })();

      onSelectRef.current?.(target);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup',   onPointerUp);

    // ── Render loop ─────────────────────────────────────────────────────────
    const tick = () => {
      const dt = clockRef.current!.getDelta();
      const elapsed = clockRef.current!.elapsedTime;

      // Star twinkle
      const starMat = stars.userData.material as THREE.ShaderMaterial;
      starMat.uniforms.uTime.value = elapsed;

      // Nebula slow rotation
      nebula.children.forEach(child => {
        const spin = (child.userData.spin as number) ?? 0;
        child.rotation.y += spin;
        child.rotation.x += spin * 0.3;
      });

      // Object animation
      objectsRef.current.forEach(o => {
        // Gentle bobbing (orbit around base position)
        const t = elapsed * 0.6 + o.bobPhase;
        const bob = Math.sin(t) * 0.18;
        o.obj.position.copy(o.basePosition).add(new THREE.Vector3(0, bob, 0));

        // Spin bodies & shards
        if (o.kind === 'resource') {
          // Cluster spins as a whole
          o.obj.children.forEach(c => {
            if ((c as THREE.Mesh).isMesh) return; // not used (cluster is a group)
            c.rotation.y += dt * 0.4;
            c.rotation.x += dt * 0.15;
          });
        } else if (o.kind === 'enemy') {
          o.body.rotation.y += dt * 1.4;
          o.body.rotation.x += dt * 0.8;
        } else if (o.kind === 'base') {
          // Race-specific update owns its own per-frame motion (gears, portals, pulses).
          o.raceBase?.update(elapsed, dt);
          // Pulse halo intensity for player base
          if (o.glow && o.base?.isPlayer) {
            const pulse = 0.85 + 0.25 * Math.sin(elapsed * 1.4);
            o.glow.scale.setScalar(14 * pulse);
          }
        }

        // Selected pulse glow
        if (o === selectedRef.current && o.ring) {
          const p = 0.6 + 0.4 * Math.sin(elapsed * 4);
          (o.ring.material as THREE.MeshBasicMaterial).opacity = p;
          o.ring.scale.setScalar(1 + 0.08 * p);
        } else if (o.ring) {
          (o.ring.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      });

      controls.update();
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup',   onPointerUp);
      controls.dispose();

      // Race bases own internal geometry/material/texture caches — let them dispose first.
      objectsRef.current.forEach(o => o.raceBase?.dispose());
      instancedField?.dispose();

      // Dispose Three.js resources to avoid GPU leaks on route change
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose?.();
        const mat = (m as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(x => x.dispose());
        else if (mat) mat.dispose();
      });
      // Star shader material lives in userData
      (stars.userData.material as THREE.ShaderMaterial).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      starsRef.current = null;
      nebulaRef.current = null;
      objectsRef.current = [];
      selectedRef.current = null;
    };
  // Scene is built once and updated via the prop-sync effects below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync incoming data into refs and rebuild map objects when needed ─────
  useEffect(() => { if (bases) basesRef.current = bases; }, [bases]);
  useEffect(() => { if (resources) resRef.current = resources; }, [resources]);
  useEffect(() => { if (enemies) enemiesRef.current = enemies; }, [enemies]);

  // Rebuild map objects when datasets change identity. Cheap because counts are small.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const list = bases ?? makeBases(playerRaceRef.current);
    const prev = objectsRef.current.filter(o => o.kind === 'base');
    prev.forEach(o => {
      o.raceBase?.dispose();
      scene.remove(o.obj);
    });
    const next = list.map(createBaseObject);
    next.forEach(o => scene.add(o.obj));
    objectsRef.current = [
      ...next,
      ...objectsRef.current.filter(o => o.kind !== 'base'),
    ];
  }, [bases]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const list = resources ?? makeResources();
    const prev = objectsRef.current.filter(o => o.kind === 'resource');
    prev.forEach(o => scene.remove(o.obj));
    const next = list.map(createResourceObject);
    next.forEach(o => scene.add(o.obj));
    objectsRef.current = [
      ...objectsRef.current.filter(o => o.kind !== 'resource'),
      ...next,
    ];
  }, [resources]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const list = enemies ?? makeEnemies();
    const prev = objectsRef.current.filter(o => o.kind === 'enemy');
    prev.forEach(o => scene.remove(o.obj));
    const next = list.map(createEnemyObject);
    next.forEach(o => scene.add(o.obj));
    objectsRef.current = [
      ...objectsRef.current.filter(o => o.kind !== 'enemy'),
      ...next,
    ];
  }, [enemies]);

  // Race change → re-tint nebula
  useEffect(() => {
    playerRaceRef.current = playerRace;
    const scene = sceneRef.current;
    const oldNebula = nebulaRef.current;
    if (!scene || !oldNebula) return;
    scene.remove(oldNebula);
    oldNebula.traverse(o => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = (m as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach(x => x.dispose());
      else mat?.dispose();
    });
    const next = createNebula(RACE_COL[playerRace]);
    scene.add(next);
    nebulaRef.current = next;

    // Race switch: rebuild the player's procedural base from scratch.
    // Each race uses a totally different geometry stack — retinting the previous
    // mesh would leave Otomat gears on a Şeytan portal, so we rebuild instead.
    const playerObj = objectsRef.current.find(o => o.kind === 'base' && o.base?.isPlayer);
    if (playerObj && playerObj.base) {
      playerObj.raceBase?.dispose();
      scene.remove(playerObj.obj);
      const updatedBase: WorldBase = { ...playerObj.base, race: playerRace };
      const rebuilt = createBaseObject(updatedBase);
      scene.add(rebuilt.obj);
      objectsRef.current = objectsRef.current.map(o => (o === playerObj ? rebuilt : o));
    }
  }, [playerRace]);

  // ── Selection helper ────────────────────────────────────────────────────
  function setSelected(o: MapObject | null) {
    selectedRef.current = o;
  }

  // ── Minimap export — top-down dot projection ────────────────────────────
  useImperativeHandle(ref, () => ({
    drawMinimap(ctx: CanvasRenderingContext2D, w: number, h: number) {
      ctx.clearRect(0, 0, w, h);
      // Background
      const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/1.4);
      bg.addColorStop(0, 'rgba(20,28,52,0.9)');
      bg.addColorStop(1, 'rgba(8,10,16,0.95)');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // Sphere outline
      const cx = w/2, cy = h/2;
      const r = Math.min(w, h) * 0.42;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Project XZ plane (top-down)
      const proj = (v: THREE.Vector3) => ({
        x: cx + (v.x / SPHERE_RADIUS) * r,
        y: cy + (v.z / SPHERE_RADIUS) * r,
      });

      objectsRef.current.forEach(o => {
        const p = proj(o.basePosition);
        if (o.kind === 'base' && o.base) {
          const col = RACE_COL[o.base.race];
          ctx.beginPath();
          ctx.arc(p.x, p.y, o.base.isPlayer ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
          if (o.base.isPlayer) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.strokeStyle = col;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        } else if (o.kind === 'resource' && o.resource) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = RES_COL[o.resource.kind];
          ctx.fill();
        } else if (o.kind === 'enemy') {
          ctx.fillStyle = '#ff3344';
          ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        }
      });

      // Camera direction marker
      const cam = cameraRef.current;
      if (cam) {
        const dir = new THREE.Vector3(0, 0, 0).sub(cam.position).normalize();
        const ax = cx + dir.x * (r - 6);
        const ay = cy + dir.z * (r - 6);
        ctx.beginPath();
        ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
      }
    },
  }), []);

  return (
    <div
      ref={containerRef}
      className={`block w-full h-full ${className ?? ''}`}
      style={{ background:'#04060c', touchAction:'none' }}
    />
  );
});

export default SphericalMap;
