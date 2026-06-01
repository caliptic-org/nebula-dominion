import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
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
  /** True after we've fanned out the awardXp grant for this completion. The
   *  in-memory store has no DB-backed idempotency, so we guard against
   *  re-granting on every poll of GET /tech/me — once xpGranted=true, the
   *  XP source is closed for this (user, techId, completion). A subsequent
   *  cancel() resets the entry and clears this flag implicitly. */
  xpGranted?: boolean;
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
  private readonly logger = new Logger(ResearchStubController.name);

  @Get('me')
  @ApiOperation({ summary: 'My research progress as a { techId: state } map' })
  async me(@Request() req: any): Promise<Record<string, TechState>> {
    const userId: string = req.user?.id ?? 'unknown';
    const authorization: string | undefined = req.headers?.authorization;
    const m = getUserMap(userId);
    const now = Date.now();
    const out: Record<string, TechState> = {};
    // Collect newly-completed entries to fan-out award-xp AFTER we finish
    // walking the map (so a slow HTTP call doesn't stall the response).
    const newlyCompleted: string[] = [];
    for (const [techId, entry] of m) {
      if (
        entry.state === 'researching' &&
        entry.completesAt &&
        new Date(entry.completesAt).getTime() <= now
      ) {
        entry.state = 'completed';
        entry.progress = 1;
        if (!entry.xpGranted) {
          newlyCompleted.push(techId);
          entry.xpGranted = true; // optimistic — set BEFORE the HTTP fan-out
          // so concurrent /me polls don't double-trigger.
        }
      }
      out[techId] = entry.state;
    }
    // Fire-and-forget XP grants. We don't await — the GET response shouldn't
    // wait on a cross-service call. If award-xp fails (game-server down,
    // network blip), we log it; xpGranted stays true (won't retry) which
    // means a missed grant is permanently lost. Acceptable for the stub
    // research module — when a real research subsystem is built on
    // game-server, the grant moves there and gets DB-backed idempotency.
    if (authorization && newlyCompleted.length > 0) {
      for (const techId of newlyCompleted) {
        this.awardResearchXp(authorization, userId, techId).catch((err) => {
          this.logger.warn(
            `award-xp(research) failed user=${userId} tech=${techId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      }
    }
    return out;
  }

  /** POST game-server's /api/progression/award-xp to grant +XP for the
   *  research completion. Uses XpSource.QUEST_MEDIUM (base 150 XP) — closest
   *  match to "completing a 5-minute investment with a discrete unlock";
   *  research isn't a daily / battle / construction event so we don't reach
   *  for those XpSource buckets. */
  private async awardResearchXp(
    authorization: string,
    userId: string,
    techId: string,
  ): Promise<void> {
    const baseUrl = (
      process.env.GAME_SERVER_URL || 'http://localhost:5000'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/api/progression/award-xp`;
    const body = {
      userId,
      source: 'quest_medium',
      referenceId: `research:${techId}`,
    };
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`non-2xx ${res.status} ${text.slice(0, 200)}`);
      }
    } finally {
      clearTimeout(timer);
    }
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
