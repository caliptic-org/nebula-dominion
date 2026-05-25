import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/* Research / tech stub.
 *
 * Per-user research state, keyed by tech id. Three states:
 *   available  → can be started
 *   researching → timer ticking (demo: 5 minutes)
 *   completed   → done; UI shows unlocked
 *
 * Time-based promotion to 'completed' happens lazily inside GET /tech/me so we
 * don't need a background timer. */

type TechState = 'available' | 'researching' | 'completed';

interface TechEntry {
  state: TechState;
  startedAt?: string;
  progress?: number;
  completesAt?: string;
}

const TECH = new Map<string, Map<string, TechEntry>>();
const RESEARCH_DURATION_SEC = 300; // 5 min demo

function getUserMap(userId: string): Map<string, TechEntry> {
  let m = TECH.get(userId);
  if (!m) {
    m = new Map();
    TECH.set(userId, m);
  }
  return m;
}

@ApiTags('research (stub)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tech')
export class ResearchStubController {
  @Get('me')
  @ApiOperation({ summary: 'My research progress as a { techId: state } map' })
  me(@Request() req: any): Record<string, TechState> {
    const userId: string = req.user?.id ?? 'unknown';
    const m = getUserMap(userId);
    const now = Date.now();
    const out: Record<string, TechState> = {};
    for (const [techId, entry] of m) {
      if (
        entry.state === 'researching' &&
        entry.completesAt &&
        new Date(entry.completesAt).getTime() <= now
      ) {
        entry.state = 'completed';
        entry.progress = 1;
      }
      out[techId] = entry.state;
    }
    return out;
  }

  @Post(':techId/research')
  @ApiOperation({ summary: 'Start researching a tech (5 minute demo timer)' })
  @ApiParam({ name: 'techId' })
  start(
    @Request() req: any,
    @Param('techId') techId: string,
    @Body() _body: unknown,
  ): TechEntry {
    const userId: string = req.user?.id ?? 'unknown';
    const m = getUserMap(userId);
    const existing = m.get(techId);
    if (existing && (existing.state === 'researching' || existing.state === 'completed')) {
      throw new HttpException(
        `Bu teknoloji zaten ${existing.state}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const now = new Date();
    const entry: TechEntry = {
      state: 'researching',
      startedAt: now.toISOString(),
      completesAt: new Date(now.getTime() + RESEARCH_DURATION_SEC * 1000).toISOString(),
      progress: 0,
    };
    m.set(techId, entry);
    return entry;
  }

  @Post(':techId/cancel')
  @ApiOperation({ summary: 'Reset a tech to "available"' })
  @ApiParam({ name: 'techId' })
  cancel(
    @Request() req: any,
    @Param('techId') techId: string,
    @Body() _body: unknown,
  ): TechEntry {
    const userId: string = req.user?.id ?? 'unknown';
    const m = getUserMap(userId);
    const entry: TechEntry = { state: 'available' };
    m.set(techId, entry);
    return entry;
  }
}
