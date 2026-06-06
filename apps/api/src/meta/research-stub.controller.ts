import {
  BadRequestException,
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
 *
 * BLOCKER E1 — UNBOUNDED TECH-ID VECTOR (fixed):
 *  Previously this controller accepted ANY string as `techId`. The
 *  per-(user, techId) cooldown is enforced, but each NEW techId is an
 *  independent bucket — so a player could POST 1000 distinct techIds in
 *  one burst, wait 5 minutes, GET /tech/me, and have all 1000 promoted
 *  to `completed` at once. award-xp's referenceId
 *  `research:<userId>:<techId>:<startedAt>` is DISTINCT for each fake
 *  tech, so the UNIQUE constraint that protects against double-credit
 *  for the SAME research does NOT dedupe across distinct fake techs.
 *  Net effect: a single attacker burst → 1000 × QUEST_MEDIUM (150 XP)
 *  ≈ 150,000 XP in 5 minutes.
 *
 *  Defence-in-depth applied here:
 *   1. VALID_TECH_IDS allowlist — only known tech tree slugs from the
 *      frontend catalog (apps/web/src/app/research/page.tsx) are accepted.
 *      Unknown techIds 400 immediately.
 *   2. MAX_CONCURRENT_RESEARCHING — at most 3 entries in the
 *      'researching' state per user at any given moment. Blocks the
 *      "queue 1000 in one tick" attack even within the allowlist
 *      (e.g. starting all 18 known techs simultaneously).
 *   3. RESEARCH_DAILY_XP_CAP — per-user UTC-day ledger on XP granted
 *      from research completions. Cap = 1500 XP/day (≈10 completions).
 *      If the cap is exceeded the GET /tech/me promotion still happens
 *      but the fan-out to award-xp is skipped with a warning, so the
 *      player still sees `completed` but no XP credit is fired.
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

/**
 * Allowlist of accepted tech slugs. Sourced from the frontend tech-tree
 * catalog in `apps/web/src/app/research/page.tsx` (INITIAL_CATEGORIES).
 *
 * Categories:
 *   ek-* → Ekonomi (economy)
 *   as-* → Askeri (military)
 *   sv-* → Savunma (defense)
 *
 * Any techId not in this set is rejected by POST /tech/:techId/research
 * with HTTP 400 BEFORE any state is mutated. This is the primary defence
 * against the unbounded-vector exploit described in the file-level
 * JSDoc (BLOCKER E1). If the tech catalog grows on the frontend, the new
 * slugs MUST be added here too — otherwise the player can render the new
 * node in the UI but the start request 400s. There is no DB-backed tech
 * registry yet (task #200), so this hardcoded mirror is the simplest
 * correct enforcement point.
 *
 * Generic placeholder slugs (e.g. "ballistics", "warp_drive") are NOT
 * included because the actual UI never references them — keeping the
 * allowlist tight to the live catalog minimizes the legitimate attack
 * surface.
 */
const VALID_TECH_IDS = new Set<string>([
  // Ekonomi
  'ek-madencilik',
  'ek-enerji',
  'ek-rafine',
  'ek-verimlilik',
  'ek-mega',
  'ek-kuantum',
  // Askeri
  'as-silah',
  'as-egitim',
  'as-taktik',
  'as-zirh',
  'as-nukleer',
  'as-titan',
  // Savunma
  'sv-tahkimat',
  'sv-duvar',
  'sv-kalkan',
  'sv-mayin',
  'sv-kule',
  'sv-nano',
]);

/** Maximum number of techs a single user may have in the 'researching'
 *  state simultaneously. Caps the in-burst exploit vector even within the
 *  allowlist — without this, a player could start all 18 known techs in
 *  parallel and bank 18 × 150 XP every cooldown window. 3 is generous
 *  enough for the demo flow (player picks one econ + one mil + one def
 *  at a time) but tight enough that the abuse ceiling is bounded. */
const MAX_CONCURRENT_RESEARCHING = 3;

/** Per-user, per-UTC-day cap on XP that can be granted via research
 *  completions. 10 completions × 150 XP (quest_medium) = 1500 XP/day.
 *  Beyond this the GET /tech/me promotion still flips state to
 *  'completed' (so the UI doesn't look stuck) but the award-xp fan-out
 *  is skipped with a logged warning. */
const RESEARCH_DAILY_XP_CAP = 1500;

/** Per-completion XP value — matches the QUEST_MEDIUM bucket on
 *  game-server's progression service. If progression changes this value
 *  upstream, update here too or the daily cap math drifts. */
const RESEARCH_XP_PER_COMPLETION = 150;

/** Per-user XP-granted ledger, keyed by `${userId}::${utcDay}` where
 *  utcDay is `YYYY-MM-DD` in UTC. Value is the XP fanned out today.
 *  Memory grows by one entry per user per day — acceptable for the stub;
 *  a restart wipes it (worst case a player gets up to 1500 XP grace
 *  after a restart on the same day, which is bounded). */
const RESEARCH_XP_LEDGER = new Map<string, number>();

function utcDayKey(now: number): string {
  const d = new Date(now);
  // YYYY-MM-DD in UTC — slice(0, 10) on toISOString is safe and stable.
  return d.toISOString().slice(0, 10);
}

function ledgerKey(userId: string, now: number): string {
  return `${userId}::${utcDayKey(now)}`;
}

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

function countResearching(m: Map<string, TechEntry>): number {
  let n = 0;
  for (const entry of m.values()) {
    if (entry.state === 'researching') n++;
  }
  return n;
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
    //
    // BLOCKER E1: per-user-day cap. Before issuing each award-xp call,
    // consult the daily ledger and skip the fan-out if granting another
    // RESEARCH_XP_PER_COMPLETION would exceed RESEARCH_DAILY_XP_CAP.
    // The state promotion (above) is intentionally NOT rolled back —
    // the player sees the tech as completed, they just don't receive XP
    // for completions beyond the daily window. This converts the
    // unbounded-vector exploit (find a way past the allowlist + cap
    // both) into a bounded one (1500 XP/day worst case).
    if (authorization && newlyCompleted.length > 0) {
      const ldgKey = ledgerKey(userId, now);
      for (const { techId, startedAt } of newlyCompleted) {
        const granted = RESEARCH_XP_LEDGER.get(ldgKey) ?? 0;
        if (granted + RESEARCH_XP_PER_COMPLETION > RESEARCH_DAILY_XP_CAP) {
          this.logger.warn(
            `research daily XP cap reached user=${userId} tech=${techId} granted=${granted} cap=${RESEARCH_DAILY_XP_CAP}; skipping award-xp`,
          );
          continue;
        }
        // Reserve the slice BEFORE the async call so concurrent /me polls
        // can't race past the cap. If the call fails the XP is lost (same
        // best-effort posture as the pre-existing fan-out).
        RESEARCH_XP_LEDGER.set(ldgKey, granted + RESEARCH_XP_PER_COMPLETION);
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
    // BLOCKER E1: allowlist check — reject unknown techIds BEFORE any
    // state mutation. Without this, an attacker could mint arbitrary
    // techIds and fan-out unbounded XP grants via the lazy /me promotion.
    if (!VALID_TECH_IDS.has(techId)) {
      throw new BadRequestException(`Bilinmeyen tech kimliği: ${techId}`);
    }
    const m = getUserMap(userId);
    const existing = m.get(techId);
    if (existing && (existing.state === 'researching' || existing.state === 'completed')) {
      throw new HttpException(
        `Bu teknoloji zaten ${existing.state}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    // BLOCKER E1: per-user concurrency cap. Even within the allowlist,
    // a player could start all 18 valid techs at once and complete them
    // 5 minutes later. Cap simultaneous 'researching' entries to a sane
    // number (matches the typical "one per category" UX flow).
    if (countResearching(m) >= MAX_CONCURRENT_RESEARCHING) {
      throw new HttpException(
        `Aynı anda en fazla ${MAX_CONCURRENT_RESEARCHING} araştırma yürütebilirsin.`,
        HttpStatus.TOO_MANY_REQUESTS,
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
