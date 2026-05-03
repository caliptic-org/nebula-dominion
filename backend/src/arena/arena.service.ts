import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ArenaPlayerStats } from './entities/arena-player-stats.entity';
import { ArenaMatch } from './entities/arena-match.entity';
import { RedisService } from '../redis/redis.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ContributionService } from '../guild/contribution.service';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ARENA_DAILY_MATCH_LIMIT = 5;
export const ARENA_MMR_WINDOW = 100;
export const ARENA_MMR_WINDOW_EXPANDED = 200;
export const ARENA_MMR_EXPAND_AFTER_MS = 30_000;
export const ARENA_INITIAL_MMR = 1000;
export const ARENA_K_FACTOR = 32;
export const ARENA_WINNER_GEMS = 50;
export const ARENA_LOSER_GEMS = 10;
export const ARENA_WIN_POINTS = 25;
export const ARENA_LOSS_POINTS = 5;

// Tuesday=2, Friday=5, 18:00-22:00 local. We treat the request's timezone as
// "local" via tzOffsetMinutes; default UTC. The window check is permissive at
// boundaries to avoid clock skew.
const ARENA_WINDOW_DAYS = new Set([2, 5]);
const ARENA_WINDOW_START_HOUR = 18;
const ARENA_WINDOW_END_HOUR = 22;

const ARENA_QUEUE_KEY = 'arena:queue';
const ARENA_QUEUE_TTL_SECONDS = 300;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArenaWindowState {
  open: boolean;
  reason?: string;
  nextOpenAt?: string;
  closesAt?: string;
}

export interface ArenaQueueResult {
  queueId: string;
  status: 'searching' | 'matched' | 'already_queued' | 'rejected';
  reason?: string;
  opponentId?: string;
  opponentMmr?: number;
}

export interface ArenaMatchResultRequest {
  winnerId: string;
  loserId: string;
}

export interface ArenaMatchResultResponse {
  matchId: string;
  winnerId: string;
  loserId: string;
  winnerMmrBefore: number;
  loserMmrBefore: number;
  winnerMmrAfter: number;
  loserMmrAfter: number;
  winnerGemReward: number;
  loserGemReward: number;
  winnerArenaPoints: number;
  loserArenaPoints: number;
  weekKey: string;
}

export interface ArenaLeaderboardEntry {
  rank: number;
  userId: string;
  arenaPoints: number;
  mmr: number;
  wins: number;
  losses: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoWeekKey(d: Date = new Date()): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function todayUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Eloesque K-factor MMR delta. Returns winner delta (positive). Loser delta
// is the symmetric negative.
function computeMmrDelta(winnerMmr: number, loserMmr: number): number {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserMmr - winnerMmr) / 400));
  return Math.max(1, Math.round(ARENA_K_FACTOR * (1 - expectedWinner)));
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ArenaService {
  private readonly logger = new Logger(ArenaService.name);

  constructor(
    @InjectRepository(ArenaPlayerStats)
    private readonly statsRepo: Repository<ArenaPlayerStats>,
    @InjectRepository(ArenaMatch)
    private readonly matchRepo: Repository<ArenaMatch>,
    private readonly redis: RedisService,
    private readonly analytics: AnalyticsService,
    private readonly contribution: ContributionService,
  ) {}

  // ─── Window check (Tuesday/Friday 18:00-22:00) ─────────────────────────────

  isWindowOpen(now: Date = new Date(), tzOffsetMinutes = 0): ArenaWindowState {
    // Apply local TZ shift: a +180min offset (Istanbul) means local is 3h ahead
    // of UTC. We compute the *local* clock and check that against the window.
    const local = new Date(now.getTime() + tzOffsetMinutes * 60_000);
    const day = local.getUTCDay();
    const hour = local.getUTCHours();

    const dayOk = ARENA_WINDOW_DAYS.has(day);
    const hourOk = hour >= ARENA_WINDOW_START_HOUR && hour < ARENA_WINDOW_END_HOUR;

    if (dayOk && hourOk) {
      const closes = new Date(local);
      closes.setUTCHours(ARENA_WINDOW_END_HOUR, 0, 0, 0);
      return { open: true, closesAt: new Date(closes.getTime() - tzOffsetMinutes * 60_000).toISOString() };
    }
    return { open: false, reason: 'Arena is open Tuesday & Friday 18:00–22:00 local time only' };
  }

  // ─── Daily limit + stats helpers ───────────────────────────────────────────

  private async loadStats(userId: string): Promise<ArenaPlayerStats> {
    let row = await this.statsRepo.findOne({ where: { userId } });
    if (!row) {
      row = this.statsRepo.create({
        userId,
        mmr: ARENA_INITIAL_MMR,
        arenaPoints: 0,
        wins: 0,
        losses: 0,
        matchesToday: 0,
        matchesTodayDay: null,
        lastMatchAt: null,
      });
      row = await this.statsRepo.save(row);
    }
    return row;
  }

  private rolloverDailyCounter(stats: ArenaPlayerStats): void {
    const today = todayUtc();
    if (stats.matchesTodayDay !== today) {
      stats.matchesTodayDay = today;
      stats.matchesToday = 0;
    }
  }

  async getStats(userId: string): Promise<ArenaPlayerStats> {
    return this.loadStats(userId);
  }

  // ─── Queue (MMR-window matchmaking, ±100 → ±200) ───────────────────────────

  async joinQueue(
    userId: string,
    opts: { tzOffsetMinutes?: number; allowOutsideWindow?: boolean } = {},
  ): Promise<ArenaQueueResult> {
    const window = this.isWindowOpen(new Date(), opts.tzOffsetMinutes ?? 0);
    if (!window.open && !opts.allowOutsideWindow) {
      return { queueId: '', status: 'rejected', reason: window.reason };
    }

    const stats = await this.loadStats(userId);
    this.rolloverDailyCounter(stats);
    if (stats.matchesToday >= ARENA_DAILY_MATCH_LIMIT) {
      return {
        queueId: '',
        status: 'rejected',
        reason: `Daily match limit reached (${ARENA_DAILY_MATCH_LIMIT}/day)`,
      };
    }
    await this.statsRepo.save(stats);

    const existingRaw = await this.redis.get(`arena:player:${userId}`);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw);
      return { queueId: existing.queueId, status: 'already_queued' };
    }

    const queueId = uuidv4();
    const entry = { queueId, userId, mmr: stats.mmr, joinedAt: Date.now() };

    await this.redis.zadd(ARENA_QUEUE_KEY, stats.mmr, userId);
    await this.redis.set(
      `arena:player:${userId}`,
      JSON.stringify(entry),
      ARENA_QUEUE_TTL_SECONDS,
    );

    this.logger.log(`Player ${userId} joined arena queue (mmr=${stats.mmr})`);
    return { queueId, status: 'searching' };
  }

  async checkQueue(userId: string): Promise<ArenaQueueResult> {
    const entryRaw = await this.redis.get(`arena:player:${userId}`);
    if (!entryRaw) return { queueId: '', status: 'rejected', reason: 'Not in queue' };
    const entry = JSON.parse(entryRaw);

    const matchRaw = await this.redis.get(`arena:match:${entry.queueId}`);
    if (matchRaw) {
      const m = JSON.parse(matchRaw);
      return { queueId: entry.queueId, status: 'matched', opponentId: m.opponentId, opponentMmr: m.opponentMmr };
    }

    const waitMs = Date.now() - entry.joinedAt;
    const window = waitMs >= ARENA_MMR_EXPAND_AFTER_MS ? ARENA_MMR_WINDOW_EXPANDED : ARENA_MMR_WINDOW;
    const minMmr = entry.mmr - window;
    const maxMmr = entry.mmr + window;

    const candidates = await this.redis.zrangebyscore(ARENA_QUEUE_KEY, minMmr, maxMmr);
    for (const candidateId of candidates) {
      if (candidateId === userId) continue;
      const cRaw = await this.redis.get(`arena:player:${candidateId}`);
      if (!cRaw) continue;
      const candidate = JSON.parse(cRaw);

      // Optimistic claim: try to delete candidate's queue entry
      const claimed = await this.redis.del(`arena:player:${candidateId}`);
      if (!claimed) continue;
      await this.redis.zrem(ARENA_QUEUE_KEY, candidateId);

      const myMatch = JSON.stringify({ opponentId: candidateId, opponentMmr: candidate.mmr });
      const theirMatch = JSON.stringify({ opponentId: userId, opponentMmr: entry.mmr });
      await this.redis.set(`arena:match:${entry.queueId}`, myMatch, 120);
      await this.redis.set(`arena:match:${candidate.queueId}`, theirMatch, 120);

      await this.redis.del(`arena:player:${userId}`);
      await this.redis.zrem(ARENA_QUEUE_KEY, userId);

      this.logger.log(
        `Arena match: ${userId}(${entry.mmr}) vs ${candidateId}(${candidate.mmr}) — window=${window}`,
      );
      return {
        queueId: entry.queueId,
        status: 'matched',
        opponentId: candidateId,
        opponentMmr: candidate.mmr,
      };
    }

    return { queueId: entry.queueId, status: 'searching' };
  }

  async leaveQueue(userId: string): Promise<void> {
    await this.redis.del(`arena:player:${userId}`);
    await this.redis.zrem(ARENA_QUEUE_KEY, userId);
  }

  // ─── Match result: MMR update, gem reward, arena points, telemetry ────────

  async recordMatchResult(req: ArenaMatchResultRequest): Promise<ArenaMatchResultResponse> {
    if (req.winnerId === req.loserId) {
      throw new BadRequestException('Winner and loser must be different players');
    }

    const [winner, loser] = await Promise.all([
      this.loadStats(req.winnerId),
      this.loadStats(req.loserId),
    ]);

    this.rolloverDailyCounter(winner);
    this.rolloverDailyCounter(loser);

    if (winner.matchesToday >= ARENA_DAILY_MATCH_LIMIT) {
      throw new BadRequestException(`Winner ${req.winnerId} exceeded daily match limit`);
    }
    if (loser.matchesToday >= ARENA_DAILY_MATCH_LIMIT) {
      throw new BadRequestException(`Loser ${req.loserId} exceeded daily match limit`);
    }

    const winnerMmrBefore = winner.mmr;
    const loserMmrBefore = loser.mmr;
    const winnerDelta = computeMmrDelta(winnerMmrBefore, loserMmrBefore);
    const loserDelta = -winnerDelta;

    winner.mmr = winnerMmrBefore + winnerDelta;
    loser.mmr = Math.max(0, loserMmrBefore + loserDelta);
    winner.wins += 1;
    loser.losses += 1;
    winner.arenaPoints += ARENA_WIN_POINTS;
    loser.arenaPoints += ARENA_LOSS_POINTS;
    winner.matchesToday += 1;
    loser.matchesToday += 1;
    const now = new Date();
    winner.lastMatchAt = now;
    loser.lastMatchAt = now;

    await this.statsRepo.save([winner, loser]);

    const weekKey = isoWeekKey(now);
    const match = await this.matchRepo.save(
      this.matchRepo.create({
        winnerId: req.winnerId,
        loserId: req.loserId,
        winnerMmrBefore,
        loserMmrBefore,
        winnerMmrDelta: winnerDelta,
        loserMmrDelta: loserDelta,
        winnerGemReward: ARENA_WINNER_GEMS,
        loserGemReward: ARENA_LOSER_GEMS,
        weekKey,
      }),
    );

    // Contribution: arena_match_played × 3 (cap 15/day)
    await this.contribution.addArenaMatch(req.winnerId).catch((err) => {
      this.logger.error(`Failed to record arena contribution for ${req.winnerId}`, err);
    });
    await this.contribution.addArenaMatch(req.loserId).catch((err) => {
      this.logger.error(`Failed to record arena contribution for ${req.loserId}`, err);
    });

    // Telemetry: mid_game_events.arena_match
    await this.analytics.trackServer({
      event_type: 'arena_match',
      user_id: req.winnerId,
      session_id: match.id,
      properties: {
        match_id: match.id,
        winner_id: req.winnerId,
        loser_id: req.loserId,
        winner_mmr_before: winnerMmrBefore,
        loser_mmr_before: loserMmrBefore,
        winner_mmr_delta: winnerDelta,
        winner_gem_reward: ARENA_WINNER_GEMS,
        loser_gem_reward: ARENA_LOSER_GEMS,
        week_key: weekKey,
      },
    });

    return {
      matchId: match.id,
      winnerId: req.winnerId,
      loserId: req.loserId,
      winnerMmrBefore,
      loserMmrBefore,
      winnerMmrAfter: winner.mmr,
      loserMmrAfter: loser.mmr,
      winnerGemReward: ARENA_WINNER_GEMS,
      loserGemReward: ARENA_LOSER_GEMS,
      winnerArenaPoints: winner.arenaPoints,
      loserArenaPoints: loser.arenaPoints,
      weekKey,
    };
  }

  // ─── Weekly arena leaderboard (DB-backed; matches contribute arena points) ─

  async weeklyLeaderboard(
    weekKey: string = isoWeekKey(),
    limit = 50,
    offset = 0,
  ): Promise<{ entries: ArenaLeaderboardEntry[]; total: number; weekKey: string }> {
    // arena points are cumulative season-long, but the weekly view is composed
    // by aggregating arena_matches won/lost in that week. We compute on-the-fly.
    const rows = await this.matchRepo
      .createQueryBuilder('m')
      .select('m.winner_id', 'user_id')
      .addSelect('COUNT(*)', 'wins')
      .where('m.week_key = :wk', { wk: weekKey })
      .groupBy('m.winner_id')
      .getRawMany<{ user_id: string; wins: string }>();

    const lossRows = await this.matchRepo
      .createQueryBuilder('m')
      .select('m.loser_id', 'user_id')
      .addSelect('COUNT(*)', 'losses')
      .where('m.week_key = :wk', { wk: weekKey })
      .groupBy('m.loser_id')
      .getRawMany<{ user_id: string; losses: string }>();

    const lossMap = new Map(lossRows.map((r) => [r.user_id, parseInt(r.losses, 10)]));
    const winMap = new Map(rows.map((r) => [r.user_id, parseInt(r.wins, 10)]));

    const allIds = Array.from(new Set([...winMap.keys(), ...lossMap.keys()]));
    const stats = allIds.length
      ? await this.statsRepo.find({ where: { userId: In(allIds) } })
      : [];
    const mmrMap = new Map(stats.map((s) => [s.userId, s]));

    const computed = allIds.map((id) => {
      const w = winMap.get(id) ?? 0;
      const l = lossMap.get(id) ?? 0;
      const mmr = mmrMap.get(id)?.mmr ?? ARENA_INITIAL_MMR;
      return {
        userId: id,
        wins: w,
        losses: l,
        arenaPoints: w * ARENA_WIN_POINTS + l * ARENA_LOSS_POINTS,
        mmr,
      };
    });

    computed.sort((a, b) => b.arenaPoints - a.arenaPoints || b.mmr - a.mmr);
    const total = computed.length;
    const sliced = computed.slice(offset, offset + limit);
    const entries: ArenaLeaderboardEntry[] = sliced.map((e, idx) => ({
      rank: offset + idx + 1,
      ...e,
    }));
    return { entries, total, weekKey };
  }

  async resetDailyCounters(): Promise<{ rowsReset: number }> {
    const today = todayUtc();
    const result = await this.statsRepo
      .createQueryBuilder()
      .update()
      .set({ matchesToday: 0, matchesTodayDay: today })
      .where('matches_today_day IS NULL OR matches_today_day < :today', { today })
      .execute();
    return { rowsReset: result.affected ?? 0 };
  }
}
