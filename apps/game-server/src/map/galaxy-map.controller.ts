import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { GalaxyMapService } from './galaxy-map.service';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

/** Static node positions — mirrors GALAXY_NODES in apps/web/src/components/nd/screens/galaxy-data.ts */
const STATIC_NODES: Array<{ id: string; label: string; x: number; y: number; kind: string }> = [
  { id: 'cap',  label: 'KAEL-7',   x: 18, y: 50, kind: 'capital' },
  { id: 'c1',   label: 'Vega-2',   x: 30, y: 28, kind: 'colony'  },
  { id: 'c2',   label: 'Vega-3',   x: 28, y: 72, kind: 'colony'  },
  { id: 'm1',   label: 'Aether',   x: 42, y: 16, kind: 'mine'    },
  { id: 'r1',   label: 'Pulsar-A', x: 42, y: 50, kind: 'relay'   },
  { id: 'n1',   label: 'Helix',    x: 50, y: 36, kind: 'colony'  },
  { id: 'n2',   label: 'Orion-9',  x: 50, y: 64, kind: 'colony'  },
  { id: 'co1',  label: 'Drift-7',  x: 58, y: 22, kind: 'mine'    },
  { id: 'co2',  label: 'Sigma-X',  x: 60, y: 50, kind: 'relay'   },
  { id: 'co3',  label: 'Drift-9',  x: 58, y: 78, kind: 'mine'    },
  { id: 'e1',   label: 'Brood-A',  x: 72, y: 30, kind: 'colony'  },
  { id: 'e2',   label: 'Brood-B',  x: 72, y: 70, kind: 'colony'  },
  { id: 'em1',  label: 'Forge-3',  x: 82, y: 18, kind: 'mine'    },
  { id: 'em2',  label: 'Forge-5',  x: 82, y: 82, kind: 'mine'    },
  { id: 'ecap', label: 'BROOD-1',  x: 92, y: 50, kind: 'capital' },
  { id: 'p1',   label: 'Wyrm',     x: 14, y: 22, kind: 'mine'    },
  { id: 'p2',   label: 'Wyrm-II',  x: 14, y: 78, kind: 'mine'    },
  { id: 'p3',   label: 'Halo-3',   x: 36, y: 50, kind: 'relay'   },
];

const NODE_MAP = new Map(STATIC_NODES.map((n) => [n.id, n]));

/**
 * Travel time in seconds between two nodes based on Euclidean distance and
 * player level speed factor.
 *
 * dist is computed on 0..1 scale (coords divided by 100).
 * BASE_SECS = 300 means a full diagonal (~1.414 units) takes ~424 s at level 0.
 * Each player level adds 3% speed: level 1 → 1.03x, level 50 → 2.5x.
 */
function travelTimeSecs(
  from: { x: number; y: number },
  to: { x: number; y: number },
  playerLevel: number,
): number {
  const dx = (to.x - from.x) / 100;
  const dy = (to.y - from.y) / 100;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speedFactor = 1 + playerLevel * 0.03;
  return Math.round((dist * 300) / speedFactor);
}

function formatSeconds(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

class CaptureNodeDto {
  troops!: number;
}

@Controller('galaxy')
export class GalaxyMapController {
  constructor(private readonly galaxyMapService: GalaxyMapService) {}

  /**
   * GET /api/galaxy/nodes
   * Returns static node list enriched with current garrison count
   * for the authenticated player.
   */
  @Get('nodes')
  @UseGuards(HttpJwtGuard)
  async listNodes(@CurrentUser() userId: string) {
    const garrisons = await this.galaxyMapService.getPlayerGarrisons(userId);
    const garrisonByNode = new Map(garrisons.map((g) => [g.nodeId, g]));

    return STATIC_NODES.map((node) => {
      const garrison = garrisonByNode.get(node.id);
      return {
        ...node,
        garrisoned: garrison ? garrison.garrisonCount : 0,
        capturedAt: garrison?.capturedAt ?? null,
      };
    });
  }

  /**
   * GET /api/galaxy/nodes/travel-time
   * Query params: from, to, playerLevel
   * Returns travel time in seconds and a human-readable formatted string.
   *
   * NOTE: This route must appear before :id routes to avoid being shadowed.
   */
  @Get('nodes/travel-time')
  getTravelTime(
    @Query('from') fromId: string,
    @Query('to') toId: string,
    @Query('playerLevel') playerLevelStr: string,
  ): { seconds: number; formatted: string } {
    if (!fromId || !toId) {
      throw new BadRequestException('Query params "from" and "to" are required');
    }

    const fromNode = NODE_MAP.get(fromId);
    const toNode   = NODE_MAP.get(toId);

    if (!fromNode) throw new BadRequestException(`Unknown node id: ${fromId}`);
    if (!toNode)   throw new BadRequestException(`Unknown node id: ${toId}`);

    const playerLevel = playerLevelStr ? Math.max(0, parseInt(playerLevelStr, 10) || 0) : 0;
    const seconds = travelTimeSecs(fromNode, toNode, playerLevel);

    return { seconds, formatted: formatSeconds(seconds) };
  }

  /**
   * POST /api/galaxy/nodes/:id/capture
   * Body: { troops: number }
   * Captures the given node for the authenticated player.
   */
  @Post('nodes/:id/capture')
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.CREATED)
  async captureNode(
    @CurrentUser() userId: string,
    @Param('id') nodeId: string,
    @Body() body: CaptureNodeDto,
  ) {
    const node = NODE_MAP.get(nodeId);
    if (!node) {
      throw new BadRequestException(`Unknown node id: ${nodeId}`);
    }

    const troops = Number(body.troops);
    if (!Number.isFinite(troops) || troops < 1) {
      throw new BadRequestException('troops must be a positive integer');
    }

    return this.galaxyMapService.captureNode(userId, nodeId, node.kind, Math.floor(troops));
  }
}
