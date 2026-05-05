import type { SolarSystem, Fleet, TradeLine, DiscoveryState, RaceCode } from './types';

const RACES: (RaceCode | null)[] = ['human', 'zerg', 'automat', 'beast', 'demon', null];

/** Deterministic pseudo-random — keeps the showcase stable between renders. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export interface MockGalaxy {
  systems: SolarSystem[];
  fleets: Fleet[];
  connections: TradeLine[];
  discovery: DiscoveryState;
  worldWidth: number;
  worldHeight: number;
}

export function buildMockGalaxy(seedNum = 42): MockGalaxy {
  const rng = seeded(seedNum);
  const worldWidth = 4000;
  const worldHeight = 2400;

  // Cluster systems into 6 sectors so territory polygons feel coherent
  const sectors = [
    { id: 'core',      cx: 2000, cy: 1200, r: 600,  race: null      as RaceCode | null },
    { id: 'human-01',  cx: 900,  cy: 800,  r: 500,  race: 'human'   as RaceCode },
    { id: 'zerg-01',   cx: 3200, cy: 600,  r: 480,  race: 'zerg'    as RaceCode },
    { id: 'automat-01', cx: 600, cy: 1700, r: 420,  race: 'automat' as RaceCode },
    { id: 'beast-01',  cx: 3300, cy: 1800, r: 480,  race: 'beast'   as RaceCode },
    { id: 'demon-01',  cx: 1900, cy: 2100, r: 420,  race: 'demon'   as RaceCode },
  ];

  const systems: SolarSystem[] = [];
  let idx = 0;
  for (const sector of sectors) {
    const count = sector.id === 'core' ? 4 : 8 + Math.floor(rng() * 5);
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const radius = sector.r * Math.sqrt(rng());
      const x = sector.cx + Math.cos(angle) * radius;
      const y = sector.cy + Math.sin(angle) * radius;
      const isContested = rng() < 0.06;
      const underAttack = rng() < 0.05;
      const owner =
        sector.race ??
        (rng() < 0.3 ? RACES[Math.floor(rng() * RACES.length)] : null);
      systems.push({
        id: `sys-${idx}`,
        name: pickName(rng, idx),
        position: { x, y },
        owner,
        sectorId: sector.id,
        resources: {
          mineral: rng() < 0.6 ? Math.round(150 + rng() * 600) : null,
          gas: rng() < 0.4 ? Math.round(80 + rng() * 320) : null,
          energy: rng() < 0.5 ? Math.round(100 + rng() * 480) : null,
        },
        contested: isContested,
        underAttack,
      });
      idx++;
    }
  }

  // Trade routes between same-owner systems within a sector
  const connections: TradeLine[] = [];
  for (const sector of sectors) {
    const sectorSystems = systems.filter((s) => s.sectorId === sector.id);
    for (let i = 0; i < sectorSystems.length - 1; i++) {
      connections.push({
        fromSystemId: sectorSystems[i].id,
        toSystemId: sectorSystems[i + 1].id,
        kind: 'trade',
      });
    }
  }
  // A few alliance links across sectors
  if (systems.length > 20) {
    connections.push({ fromSystemId: systems[3].id, toSystemId: systems[15].id, kind: 'alliance' });
    connections.push({ fromSystemId: systems[8].id, toSystemId: systems[24].id, kind: 'alliance' });
  }

  // A handful of fleets with different durations so movement is staggered
  const now = performance.now ? performance.now() : Date.now();
  const fleets: Fleet[] = [
    mkFleet('flt-01', 'human',   systems, 0, 4, 'attack',   3, now, 18000),
    mkFleet('flt-02', 'zerg',    systems, 5, 12, 'attack',  4, now, 22000),
    mkFleet('flt-03', 'automat', systems, 18, 3, 'defense', 2, now, 14000),
    mkFleet('flt-04', 'beast',   systems, 22, 28, 'attack', 5, now, 26000),
    mkFleet('flt-05', 'demon',   systems, 30, 7, 'transport', 3, now, 20000),
  ];

  // Discovery — half of systems are explored, ~third are currently visible
  const explored = new Set<string>();
  const visible = new Set<string>();
  systems.forEach((s, i) => {
    if (i % 2 === 0) explored.add(s.id);
    if (i % 3 === 0) visible.add(s.id);
  });

  const discovery: DiscoveryState = { explored, visible };

  return { systems, fleets, connections, discovery, worldWidth, worldHeight };
}

function mkFleet(
  id: string,
  race: RaceCode,
  systems: SolarSystem[],
  fromIdx: number,
  toIdx: number,
  type: 'attack' | 'defense' | 'transport',
  size: number,
  now: number,
  duration: number,
): Fleet {
  const from = systems[fromIdx % systems.length];
  const to = systems[toIdx % systems.length];
  return {
    id,
    raceId: race,
    position: { ...from.position },
    destination: { ...to.position },
    departedAt: now,
    arrivalAt: now + duration,
    type,
    size,
    health: 0.65 + Math.random() * 0.3,
  };
}

const NAME_PREFIX = ['Vega', 'Orion', 'Cygnus', 'Lyra', 'Pavo', 'Carina', 'Hydra', 'Argo', 'Sirius', 'Altair', 'Tau', 'Sigma', 'Beta', 'Delta', 'Omicron', 'Helix'];
const NAME_SUFFIX = ['Prime', 'Major', 'Minor', 'IX', 'XII', 'III', 'V', 'Nox', 'Aether', 'Helio', 'Reach', 'Belt'];

function pickName(rng: () => number, idx: number): string {
  const a = NAME_PREFIX[Math.floor(rng() * NAME_PREFIX.length)];
  const b = NAME_SUFFIX[Math.floor(rng() * NAME_SUFFIX.length)];
  return `${a} ${b}-${idx}`;
}
