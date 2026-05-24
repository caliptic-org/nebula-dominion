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

const SEED: Record<string, TargetNode> = {
  co2: {
    id: 'co2',
    name: 'CORE-12',
    kind: 'capital',
    ownerRace: 'otomat',
    ownerName: 'Demiurge Prime',
    level: 8,
    power: 12_400,
    defence: 78,
    garrison: { units: 480, tier: 4, lastDeploy: '2026-05-22T18:30:00Z' },
    rewards: { gold: 8_000, gems: 120, xp: 600 },
    status: 'active',
  },
  brood1: {
    id: 'brood1',
    name: 'BROOD-1',
    kind: 'capital',
    ownerRace: 'zerg',
    ownerName: "Ana Kraliçe Vex'thara",
    level: 9,
    power: 14_200,
    defence: 82,
    garrison: { units: 612, tier: 4, lastDeploy: '2026-05-22T20:15:00Z' },
    rewards: { gold: 9_500, gems: 150, xp: 720 },
    status: 'under-attack',
  },
  temple2: {
    id: 'temple2',
    name: 'TEMPLE-2',
    kind: 'temple',
    ownerRace: 'seytan',
    ownerName: 'Karanlık Lord Malphas',
    level: 7,
    power: 9_800,
    defence: 64,
    garrison: { units: 240, tier: 3, lastDeploy: '2026-05-22T15:00:00Z' },
    rewards: { gold: 6_200, gems: 95, xp: 480 },
    status: 'idle',
  },
};

@ApiTags('target (stub)')
@Controller('target')
export class TargetStubController {
  @Get(':id')
  @ApiOperation({ summary: 'Get target node detail (stub seed)' })
  @ApiParam({ name: 'id', description: 'Node id (matches map state ids)' })
  byId(@Param('id') id: string) {
    if (SEED[id]) return SEED[id];
    // Deterministic fallback for unknown ids: synthesise a generic node so the
    // UI page never 404s. Maps the id hash to a race for variety.
    const seed = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const races: RaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];
    const r = races[seed % races.length];
    return {
      id,
      name: id.toUpperCase(),
      kind: 'outpost' as const,
      ownerRace: r,
      ownerName: null,
      level: 1 + (seed % 5),
      power: 1_000 + (seed % 8) * 500,
      defence: 30 + (seed % 50),
      garrison: { units: 40 + (seed % 60), tier: 1 + (seed % 3), lastDeploy: new Date().toISOString() },
      rewards: { gold: 500, gems: 25, xp: 120 },
      status: 'idle' as const,
    };
  }
}
