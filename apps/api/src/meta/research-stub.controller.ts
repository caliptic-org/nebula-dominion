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

/**
 * STUB controller — backed by in-memory state. Acceptable risk until
 * DB-backed module lands (task #200). Restart wipes state.
 *
 * Research / tech stub.
 *
 * Per-user research state, keyed by tech id. Three states:
 *   available  → can be started
 *   researching → timer ticking (demo: 5 minutes)
 *   completed   → done; UI shows unlocked
 *
 * Time-based promotion to 'completed' happens lazily inside GET /tech/me so we
 * don't need a background timer.
 *
 * PERIMETER HARDENINGS (F6-econ + stub-gaps research):
 *  - `isStub: true` sentinel on every entry returned/stored so downstream
 *    consumers can recognize stub provenance.
 *  - Per-user cooldown on POST /tech/:id/research: cannot start the same
 *    tech twice within 1 hour (also blocks rapid re-research after cancel).
 *  - Cancel cooldown: cannot cancel within 5 minutes of starting — kills
 *    the "start → cancel → start → reset xpGranted" exploit loop.
 *  - referenceId on award-xp is `research:<userId>:<techId>:<startedAt>`
 *    so when B1's UNIQUE constraint ships, repeated grants are rejected
 *    by the DB even if the in-memory `xpGranted` flag is lost on restart.
 */

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
   *  cancel() resets the entry and clears this flag implicitly, BUT the
   *  award-xp referenceId is `research:<userId>:<techId>:<startedAt>` so
   *  the cancel-loop still can't double-credit once B1's UNIQUE constraint
   *  on (referenceId) lands. */
  xpGranted?: boolean;
  /** Stub provenance sentinel. Always true for entries minted here so a
   *  future DB-backed reader can distinguish stub-origin rows during a
   *  cut-over migration. */
  isStub?: boolean;
}

const TECH = new Map<string, Map<string, TechEntry>>();
const RESEARCH_DURATION_SEC = 300; // 5 min demo

/** Minimum gap between two POST /tech/:id/research calls for the same
 *  (user, techId). Prevents the in-memory state from being looped after
 *  a restart wipe by simply hammering start/cancel. 1 hour matches B1's
 *  expected XP cooldown bucket for quest_medium. */
const RESEARCH_START_COOLDOWN_MS = 60 * 60 * 1000;

/** Earliest time after a `startedAt` that the player may cancel. Below
 *  this threshold, cancel is refused — eliminates the start→cancel→start
 *  loop that resets xpGranted on every iteration. */
const CANCEL_GRACE_MS = 5 * 60 * 1000;

/** Last accepted POST /tech/:id/research time per (userId, techId), so we
 *  can enforce the start cooldown even across cancel() resets. Survives
 *  cancel; does NOT survive process restart — acceptable for the stub. */
const LAST_START_AT = new Map<string, number>();

function startKey(userId: string, techId: string): string {
  return `${userId}::${techId}`;
}

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
    // We also capture startedAt for the referenceId so B1's UNIQUE
    // constraint on (referenceId) collapses any loop credit.
    const newlyCompleted: Array<{ techId: string; startedAt: string }> = [];
    for (const [techId, entry] of m) {
      if (
        entry.state === 'researching' &&
        entry.completesAt &&
        new Date(entry.completesAt).getTime() <= now
      ) {
        entry.state = 'completed';
        entry.progress = 1;
        if (!entry.xpGranted) {
          newlyCompleted.push({
            techId,
            startedAt: entry.startedAt ?? new Date(now).toISOString(),
          });
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
      for (const { techId, startedAt } of newlyCompleted) {
        this.awardResearchXp(authorization, userId, techId, startedAt).catch(
          (err) => {
            this.logger.warn(
              `award-xp(research) failed user=${userId} tech=${techId}: ${err instanceof Error ? err.message : String(err)}`,
            );
          },
        );
      }
    }
    return out;
  }

  /** POST game-server's /api/progression/award-xp to grant +XP for the
   *  research completion. Uses XpSource.QUEST_MEDIUM (base 150 XP) — closest
   *  match to "completing a 5-minute investment with a discrete unlock";
   *  research isn't a daily / battle / construction event so we don't reach
   *  for those XpSource buckets.
   *
   *  referenceId is `research:<userId>:<techId>:<startedAt>` so a player who
   *  restarts research (cancel→start→complete) generates a DISTINCT key per
   *  run, but the SAME run cannot be credited twice — once B1's UNIQUE
   *  constraint on (referenceId) ships, the second insert is rejected at
   *  the DB layer even if the in-memory xpGranted flag was lost. */
  private async awardResearchXp(
    authorization: string,
    userId: string,
    techId: string,
    startedAt: string,
  ): Promise<void> {
    const baseUrl = (
      process.env.GAME_SERVER_URL || 'http://localhost:5000'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/api/progression/award-xp`;
    const body = {
      userId,
      source: 'quest_medium',
      referenceId: `research:${userId}:${techId}:${startedAt}`,
    };
    // Audit fix (S4 + F4-econ): /progression/award-xp is now gated
    // by InternalServiceGuard on game-server — server-to-server only.
    // The Authorization JWT is no longer accepted; we sign with the
    // shared INTERNAL_SERVICE_SECRET (falling back to JWT_SECRET, the
    // same secret already used by game-server → api in reverse for
    // /quest-progress/increment). The Authorization header is left in
    // place for back-compat with any older game-server build that
    // still expects it — it's ignored once the new guard is live.
    const serviceSecret =
      process.env.INTERNAL_SERVICE_SECRET || process.env.JWT_SECRET || '';
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
          ...(serviceSecret
            ? { 'X-Internal-Service': `Bearer ${serviceSecret}` }
            : {}),
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
    // Per-user start cooldown: even if the last entry was cancelled (state
    // = 'available'), refuse to restart inside the 1 hour window. Without
    // this, a player could spam start→cancel→start to either fish for a
    // race-window XP grant or, post-restart, repopulate stub state at the
    // exact moment they want.
    const cdKey = startKey(userId, techId);
    const lastStartAt = LAST_START_AT.get(cdKey);
    const now = Date.now();
    if (lastStartAt && now - lastStartAt < RESEARCH_START_COOLDOWN_MS) {
      const waitSec = Math.ceil(
        (RESEARCH_START_COOLDOWN_MS - (now - lastStartAt)) / 1000,
      );
      throw new HttpException(
        `Bu teknolojiyi tekrar başlatmadan önce ${waitSec} sn beklemelisin.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const nowDate = new Date(now);
    const entry: TechEntry = {
      state: 'researching',
      startedAt: nowDate.toISOString(),
      completesAt: new Date(now + RESEARCH_DURATION_SEC * 1000).toISOString(),
      progress: 0,
      isStub: true,
    };
    m.set(techId, entry);
    LAST_START_AT.set(cdKey, now);
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
    const existing = m.get(techId);
    // Reject cancel within the grace window — this is the linchpin of the
    // "loop xpGranted" exploit: without it, a player could start (no XP
    // cost), wait until 4:59, cancel (resets xpGranted), and restart on
    // a fresh referenceId. With the 5-minute grace + 1-hour start cooldown,
    // the only way to legitimately complete research is to let the timer
    // run to completion.
    if (existing && existing.state === 'researching' && existing.startedAt) {
      const elapsed = Date.now() - new Date(existing.startedAt).getTime();
      if (elapsed < CANCEL_GRACE_MS) {
        const waitSec = Math.ceil((CANCEL_GRACE_MS - elapsed) / 1000);
        throw new HttpException(
          `Araştırma başladıktan sonra ${waitSec} sn iptal edilemez.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    const entry: TechEntry = { state: 'available', isStub: true };
    m.set(techId, entry);
    return entry;
  }
}
