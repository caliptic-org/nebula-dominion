import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

/* Target detail stub.
 *
 * The /target/[id] screen drills into a galactic node (sector / capital base /
 * outpost). The current map state already returns a node list; this stub
 * augments a single id with the extra detail the UI shows in the right pane
 * (race owner, garrison strength, defence rating, recent activity). */

type RaceKey = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';

interface TargetNode {
  id: string;
  name: string;
  kind: 'capital' | 'outpost' | 'asteroid' | 'nebula' | 'temple';
  ownerRace: RaceKey | null;
  ownerName: string | null;
  level: number;
  power: number;
  defence: number;
  garrison: { units: number; tier: number; lastDeploy: string };
  rewards: { gold: number; gems: number; xp: number };
  status: 'active' | 'idle' | 'under-attack';
}

/* Mirrors apps/web/src/components/nd/screens/galaxy-data.ts node graph so the
 * backend's target detail stays consistent with what the player saw on the
 * galaxy map. Previously this seed only had 3 hand-picked nodes (co2 / brood1
 * / temple2) and every other id (n1, e1, em2, …) fell through to a char-code
 * hash fallback — deterministic, but disconnected from the galaxy-data
 * narrative (Helix appeared as Şeytan, Drift-7 as İnsan, etc.).
 *
 * Owner mapping:
 *   - player    nodes → ownerRace null + status 'idle' (frontend recognises
 *                       its own colonies; the response only needs to expose
 *                       the rewards/garrison for the right-pane summary).
 *   - neutral   nodes → ownerRace null + status 'idle' (pirate / unclaimed).
 *   - contested nodes → ownerRace null + status 'under-attack'.
 *   - enemy     nodes → ownerRace 'zerg' (default enemy race for the seeded
 *                       İnsan player; remains stable across reloads).
 *
 * Rewards/power/level numbers come straight from GALAXY_NODES so /target/:id
 * and /map side-panel agree to the last digit. */
const SEED: Record<string, TargetNode> = {
  // ── Player capital + colonies ────────────────────────────────────────
  cap:   mkNode('cap',   'KAEL-7',   'capital', null,     9, 4200,    0,   0,  0),
  c1:    mkNode('c1',    'Vega-2',   'outpost', null,     5, 1180,    0,   0,  0),
  c2:    mkNode('c2',    'Vega-3',   'outpost', null,     4,  980,    0,   0,  0),
  m1:    mkNode('m1',    'Aether',   'asteroid',null,     3,  320,    0,   0,  0),
  r1:    mkNode('r1',    'Pulsar-A', 'outpost', null,     2,   60,    0,   0,  0),

  // ── Neutral colonies + outposts ──────────────────────────────────────
  n1:    mkNode('n1',    'Helix',    'outpost', null,     3,  540,  380, 140,  8),
  n2:    mkNode('n2',    'Orion-9',  'outpost', null,     4,  720,  520, 210, 10),
  p1:    mkNode('p1',    'Wyrm',     'asteroid',null,     2,  180,  280,  20,  5),
  p2:    mkNode('p2',    'Wyrm-II',  'asteroid',null,     2,  200,  310,  25,  5),
  p3:    mkNode('p3',    'Halo-3',   'outpost', null,     2,   90,  120,  80,  7),

  // ── Contested nodes ───────────────────────────────────────────────────
  co1:   mkContested('co1',   'Drift-7', 5,  880,  680,  80, 12),
  co2:   mkContested('co2',   'Sigma-X', 6, 1240,  420, 260, 18),
  co3:   mkContested('co3',   'Drift-9', 5,  760,  640,  70, 11),

  // ── Enemy nodes ───────────────────────────────────────────────────────
  e1:    mkEnemy('e1',    'Brood-A',  'outpost', 7, 2140,  920, 380, 22),
  e2:    mkEnemy('e2',    'Brood-B',  'outpost', 6, 1820,  780, 320, 19),
  em1:   mkEnemy('em1',   'Forge-3',  'asteroid',4,  460, 1100,  60, 14),
  em2:   mkEnemy('em2',   'Forge-5',  'asteroid',4,  420,  980,  50, 13),
  ecap:  mkEnemy('ecap',  'BROOD-1',  'capital',10, 5840, 2400, 900, 55),

  // ── Legacy lore ids (kept so old links / test data don't 404) ────────
  brood1:  mkEnemy('brood1', 'BROOD-1', 'capital', 9, 14200,  9500,  150, 0),
  temple2: {
    id: 'temple2', name: 'TEMPLE-2', kind: 'temple',
    ownerRace: 'seytan', ownerName: 'Karanlık Lord Malphas',
    level: 7, power: 9_800, defence: 64,
    garrison: { units: 240, tier: 3, lastDeploy: '2026-05-22T15:00:00Z' },
    rewards: { gold: 6_200, gems: 95, xp: 480 },
    status: 'idle',
  },
};

/* Builder helpers — match the four galaxy-data owner buckets.  Each node's
 * `power` doubles as its garrison strength (defence ≈ power/30); rewards
 * mirror the galaxy-data values so /target/:id and the /map side-panel
 * agree on the mineral/gas/science prizes. */
function mkNode(
  id: string, name: string,
  kind: TargetNode['kind'],
  ownerRace: RaceKey | null,
  level: number, power: number,
  mineral: number, gas: number, science: number,
): TargetNode {
  return {
    id, name, kind, ownerRace,
    ownerName: ownerRace ? raceCommander(ownerRace) : null,
    level, power,
    defence: Math.max(20, Math.min(95, Math.floor(power / 30))),
    garrison: {
      units: Math.max(20, Math.floor(power / 8)),
      tier: Math.min(5, Math.max(1, Math.floor(level / 2) + 1)),
      lastDeploy: '2026-05-22T18:00:00Z',
    },
    // `gold` carries the mineral reward (legacy field name from the
    // /battle-result mock economy); `gems` = gas; xp scales with science.
    rewards: { gold: mineral, gems: gas, xp: 120 + science * 10 },
    status: 'idle',
  };
}

function mkContested(
  id: string, name: string,
  level: number, power: number,
  mineral: number, gas: number, science: number,
): TargetNode {
  return {
    ...mkNode(id, name, 'outpost', null, level, power, mineral, gas, science),
    status: 'under-attack',
  };
}

function mkEnemy(
  id: string, name: string,
  kind: TargetNode['kind'],
  level: number, power: number,
  mineral: number, gas: number, science: number,
): TargetNode {
  return {
    ...mkNode(id, name, kind, 'zerg', level, power, mineral, gas, science),
    status: 'active',
  };
}

function raceCommander(race: RaceKey): string {
  const map: Record<RaceKey, string> = {
    insan:   'Kmt. A. Voss',
    zerg:    "Ana Kraliçe Vex'thara",
    otomat:  'Demiurge Prime',
    canavar: 'Alfa Khorvash',
    seytan:  'Karanlık Lord Malphas',
  };
  return map[race];
}

@ApiTags('target (stub)')
@Controller('target')
export class TargetStubController {
  @Get(':id')
  @ApiOperation({ summary: 'Get target node detail (stub seed)' })
  @ApiParam({ name: 'id', description: 'Node id (matches map state ids)' })
  byId(@Param('id') id: string) {
    if (SEED[id]) return SEED[id];
    // Deterministic fallback for unknown ids — `ownerRace` is intentionally
    // null so the frontend's `enemyRaceKey` logic falls back to the static
    // galaxy-data lore (which already knows the right race for known ids)
    // instead of an arbitrary char-code hash that previously assigned
    // Helix→Şeytan, Drift-7→İnsan, etc.  Numeric fields are deterministic
    // from the id hash so repeat hits return identical numbers.
    const seed = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return {
      id,
      name: id.toUpperCase(),
      kind: 'outpost' as const,
      ownerRace: null,
      ownerName: null,
      level: 1 + (seed % 5),
      power: 1_000 + (seed % 8) * 500,
      defence: 30 + (seed % 50),
      garrison: { units: 40 + (seed % 60), tier: 1 + (seed % 3), lastDeploy: '2026-05-22T18:00:00Z' },
      rewards: { gold: 500, gems: 25, xp: 120 },
      status: 'idle' as const,
    };
  }
}
