import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { LeaderboardSnapshot } from './entities/leaderboard-snapshot.entity';
import { LeaderboardCategory, LeaderboardPeriod } from './dto/v1-leaderboard-query.dto';

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  score: number;
}

export interface PlayerRankResult {
  playerId: string;
  username: string;
  score: number;
  globalRank: number | null;
}

export interface UserProfile {
  name: string;
  race: string;
  portrait_url: string;
  alliance_name?: string;
}

export interface V1LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  race: string;
  portrait_url: string;
  score: number;
  score_label: string;
  alliance_name: string | null;
  delta_rank: number;
}

export interface V1LeaderboardResponse {
  entries: V1LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface V1MeResponse {
  rank: number | null;
  score: number;
  score_label: string;
  delta_rank: number;
}

export interface V1PeriodResponse {
  reset_at: string;
  type: string;
}

const KEYS = {
  global: 'leaderboard:global',
  sector: (sectorId: string) => `leaderboard:sector:${sectorId}`,
  usernames: 'leaderboard:usernames',
  v1Scores: (category: string, period: string, periodKey: string) =>
    `lb:scores:${category}:${period}:${periodKey}`,
  profile: (userId: string) => `lb:profile:${userId}`,
  listCache: (category: string, period: string, page: number, limit: number) =>
    `lb:cache:${category}:${period}:${page}:${limit}`,
  meCache: (userId: string, category: string, period: string) =>
    `lb:cache:me:${userId}:${category}:${period}`,
};

const SECTOR_LB_TTL = 86400;
const LIST_CACHE_TTL = 60;
const ME_CACHE_TTL = 30;

// ── Period key helpers ──────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function currentWeekKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const week = getISOWeek(now);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function previousWeekKey(current: string): string {
  const [yearStr, wStr] = current.split('-W');
  let week = parseInt(wStr) - 1;
  let year = parseInt(yearStr);
  if (week <= 0) {
    year -= 1;
    week = 52;
  }
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// Seasons are 90-day periods since 2026-01-01
const SEASON_EPOCH = new Date('2026-01-01T00:00:00Z').getTime();

function currentSeasonKey(): string {
  const daysSinceEpoch = Math.floor((Date.now() - SEASON_EPOCH) / 86400000);
  const season = Math.max(1, Math.floor(daysSinceEpoch / 90) + 1);
  const year = new Date().getUTCFullYear();
  return `${year}-S${season}`;
}

function previousSeasonKey(current: string): string {
  const [yearStr, sStr] = current.split('-S');
  let season = parseInt(sStr) - 1;
  let year = parseInt(yearStr);
  if (season <= 0) {
    year -= 1;
    season = 4;
  }
  return `${year}-S${season}`;
}

function getPeriodKey(period: LeaderboardPeriod): string {
  return period === LeaderboardPeriod.WEEKLY ? currentWeekKey() : currentSeasonKey();
}

function getPrevPeriodKey(period: LeaderboardPeriod, current: string): string {
  return period === LeaderboardPeriod.WEEKLY
    ? previousWeekKey(current)
    : previousSeasonKey(current);
}

function nextWeeklyReset(): Date {
  const now = new Date();
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
  return reset;
}

function nextSeasonalReset(): Date {
  const daysSinceEpoch = Math.floor((Date.now() - SEASON_EPOCH) / 86400000);
  const nextResetDay = (Math.floor(daysSinceEpoch / 90) + 1) * 90;
  return new Date(SEASON_EPOCH + nextResetDay * 86400000);
}

// ── Score label formatter ────────────────────────────────────────────────────

function formatScore(score: number): string {
  if (score >= 1_000_000) {
    return `${(score / 1_000_000).toFixed(2)}M`;
  }
  if (score >= 1_000) {
    return `${(score / 1_000).toFixed(1)}K`;
  }
  return String(score);
}

// ────────────────────────────────────────────────────────────────────────────

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly redis: RedisService,
    @InjectRepository(LeaderboardSnapshot)
    private readonly snapshotRepo: Repository<LeaderboardSnapshot>,
  ) {}

  // ─── Profile helpers ───────────────────────────────────────────────────────

  async upsertUserProfile(userId: string, profile: UserProfile): Promise<void> {
    await this.redis.set(KEYS.profile(userId), JSON.stringify(profile));
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    const raw = await this.redis.get(KEYS.profile(userId));
    if (raw) {
      try {
        return JSON.parse(raw) as UserProfile;
      } catch {
        // fall through
      }
    }
    return { name: userId.slice(0, 8), race: 'insan', portrait_url: '', alliance_name: undefined };
  }

  // ─── V1 score update (called by game services) ─────────────────────────────

  async addV1Score(
    category: LeaderboardCategory,
    period: LeaderboardPeriod,
    userId: string,
    profile: UserProfile,
    delta: number,
  ): Promise<number> {
    await this.upsertUserProfile(userId, profile);
    const periodKey = getPeriodKey(period);
    const scoreKey = KEYS.v1Scores(category, period, periodKey);
    const newScore = await this.redis.zincrby(scoreKey, delta, userId);
    this.logger.debug(`V1 score: ${userId} ${category}/${period} +${delta} = ${newScore}`);
    return newScore;
  }

  async setV1Score(
    category: LeaderboardCategory,
    period: LeaderboardPeriod,
    userId: string,
    profile: UserProfile,
    score: number,
  ): Promise<void> {
    await this.upsertUserProfile(userId, profile);
    const periodKey = getPeriodKey(period);
    await this.redis.zadd(KEYS.v1Scores(category, period, periodKey), score, userId);
  }

  // ─── GET /api/v1/leaderboard ───────────────────────────────────────────────

  async getLeaderboardV1(
    category: LeaderboardCategory,
    period: LeaderboardPeriod,
    page: number,
    limit: number,
  ): Promise<V1LeaderboardResponse> {
    const cacheKey = KEYS.listCache(category, period, page, limit);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as V1LeaderboardResponse;
      } catch {
        // fall through on parse error
      }
    }

    const periodKey = getPeriodKey(period);
    const scoreKey = KEYS.v1Scores(category, period, periodKey);
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    const [raw, total] = await Promise.all([
      this.redis.zrevrangeWithScores(scoreKey, start, stop),
      this.redis.zcard(scoreKey),
    ]);

    const userIds = raw.map((e) => e.value);
    const profiles = await Promise.all(userIds.map((id) => this.getUserProfile(id)));

    const prevPeriodKey = getPrevPeriodKey(period, periodKey);
    const prevSnapshots =
      userIds.length > 0
        ? await this.snapshotRepo.find({
            where: { userId: In(userIds), category, periodType: period, periodKey: prevPeriodKey },
          })
        : [];

    const prevRankMap = new Map(prevSnapshots.map((s) => [s.userId, s.rank]));

    const entries: V1LeaderboardEntry[] = raw.map((entry, idx) => {
      const currentRank = start + idx + 1;
      const prevRank = prevRankMap.get(entry.value) ?? currentRank;
      const profile = profiles[idx];
      return {
        rank: currentRank,
        user_id: entry.value,
        name: profile.name,
        race: profile.race,
        portrait_url: profile.portrait_url,
        score: entry.score,
        score_label: formatScore(entry.score),
        alliance_name: profile.alliance_name ?? null,
        delta_rank: prevRank - currentRank,
      };
    });

    const result: V1LeaderboardResponse = { entries, total, page, limit };
    await this.redis.set(cacheKey, JSON.stringify(result), LIST_CACHE_TTL);
    return result;
  }

  // ─── GET /api/v1/leaderboard/me ───────────────────────────────────────────

  async getMyRankV1(
    userId: string,
    category: LeaderboardCategory,
    period: LeaderboardPeriod,
  ): Promise<V1MeResponse> {
    const cacheKey = KEYS.meCache(userId, category, period);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as V1MeResponse;
      } catch {
        // fall through
      }
    }

    const periodKey = getPeriodKey(period);
    const scoreKey = KEYS.v1Scores(category, period, periodKey);

    const [rank, score] = await Promise.all([
      this.redis.zrank(scoreKey, userId),
      this.redis.zscore(scoreKey, userId),
    ]);

    const currentScore = score ?? 0;
    const currentRank = rank;

    const prevPeriodKey = getPrevPeriodKey(period, periodKey);
    const prevSnapshot = await this.snapshotRepo.findOne({
      where: { userId, category, periodType: period, periodKey: prevPeriodKey },
    });

    const prevRank = prevSnapshot?.rank ?? currentRank ?? 0;
    const deltaRank = currentRank != null ? prevRank - currentRank : 0;

    const result: V1MeResponse = {
      rank: currentRank,
      score: currentScore,
      score_label: formatScore(currentScore),
      delta_rank: deltaRank,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), ME_CACHE_TTL);
    return result;
  }

  // ─── GET /api/v1/leaderboard/period ───────────────────────────────────────

  getPeriodInfo(type: LeaderboardPeriod): V1PeriodResponse {
    const resetAt =
      type === LeaderboardPeriod.WEEKLY ? nextWeeklyReset() : nextSeasonalReset();
    return {
      reset_at: resetAt.toISOString(),
      type,
    };
  }

  // ─── Snapshot (called at end of each period by scheduler) ─────────────────

  async saveSnapshot(
    category: LeaderboardCategory,
    period: LeaderboardPeriod,
    periodKey: string,
  ): Promise<number> {
    const scoreKey = KEYS.v1Scores(category, period, periodKey);
    const total = await this.redis.zcard(scoreKey);
    if (total === 0) return 0;

    // Read all entries in batches
    const batchSize = 500;
    let saved = 0;
    for (let offset = 0; offset < total; offset += batchSize) {
      const entries = await this.redis.zrevrangeWithScores(scoreKey, offset, offset + batchSize - 1);
      const snapshots = entries.map((e, idx) =>
        this.snapshotRepo.create({
          userId: e.value,
          category,
          periodType: period,
          periodKey,
          rank: offset + idx + 1,
          score: e.score,
        }),
      );
      await this.snapshotRepo.upsert(snapshots, {
        conflictPaths: ['userId', 'category', 'periodType', 'periodKey'],
        skipUpdateIfNoValuesChanged: true,
      });
      saved += snapshots.length;
    }
    this.logger.log(`Snapshot saved: ${saved} entries for ${category}/${period}/${periodKey}`);
    return saved;
  }

  // ─── Legacy: Write helpers ─────────────────────────────────────────────────

  async recordUsername(playerId: string, username: string): Promise<void> {
    await this.redis.set(`${KEYS.usernames}:${playerId}`, username);
  }

  private async getUsername(playerId: string): Promise<string> {
    return (await this.redis.get(`${KEYS.usernames}:${playerId}`)) ?? playerId.slice(0, 8);
  }

  // ─── Legacy: Global leaderboard ───────────────────────────────────────────

  async addGlobalScore(playerId: string, username: string, delta: number): Promise<number> {
    await this.recordUsername(playerId, username);
    const newScore = await this.redis.zincrby(KEYS.global, delta, playerId);
    this.logger.debug(`Global score updated: ${playerId} +${delta} = ${newScore}`);
    return newScore;
  }

  async setGlobalScore(playerId: string, username: string, score: number): Promise<void> {
    await this.recordUsername(playerId, username);
    await this.redis.zadd(KEYS.global, score, playerId);
  }

  async getGlobalLeaderboard(limit = 50, offset = 0): Promise<LeaderboardEntry[]> {
    const raw = await this.redis.zrevrangeWithScores(KEYS.global, offset, offset + limit - 1);
    return Promise.all(
      raw.map(async (entry, idx) => ({
        rank: offset + idx + 1,
        playerId: entry.value,
        username: await this.getUsername(entry.value),
        score: entry.score,
      })),
    );
  }

  async getGlobalRank(playerId: string): Promise<PlayerRankResult> {
    const [rank, score] = await Promise.all([
      this.redis.zrank(KEYS.global, playerId),
      this.redis.zscore(KEYS.global, playerId),
    ]);
    return {
      playerId,
      username: await this.getUsername(playerId),
      score: score ?? 0,
      globalRank: rank,
    };
  }

  async getGlobalTotal(): Promise<number> {
    return this.redis.zcard(KEYS.global);
  }

  // ─── Legacy: Sector leaderboard ───────────────────────────────────────────

  async addSectorScore(sectorId: string, playerId: string, username: string, delta: number): Promise<number> {
    await this.recordUsername(playerId, username);
    const key = KEYS.sector(sectorId);
    const newScore = await this.redis.zincrby(key, delta, playerId);
    await this.redis.set(`${key}:ttl_flag`, '1', SECTOR_LB_TTL);
    return newScore;
  }

  async getSectorLeaderboard(sectorId: string, limit = 20): Promise<LeaderboardEntry[]> {
    const raw = await this.redis.zrevrangeWithScores(KEYS.sector(sectorId), 0, limit - 1);
    return Promise.all(
      raw.map(async (entry, idx) => ({
        rank: idx + 1,
        playerId: entry.value,
        username: await this.getUsername(entry.value),
        score: entry.score,
      })),
    );
  }

  async getSectorRank(sectorId: string, playerId: string): Promise<number | null> {
    return this.redis.zrank(KEYS.sector(sectorId), playerId);
  }

  // ─── Legacy: Weekly leaderboard (by leagueId) ─────────────────────────────

  async addWeeklyScore(leagueId: string, playerId: string, username: string, delta: number): Promise<number> {
    await this.recordUsername(playerId, username);
    return this.redis.zincrby(`leaderboard:weekly:${leagueId}`, delta, playerId);
  }

  async getWeeklyLeaderboard(leagueId: string, limit = 50): Promise<LeaderboardEntry[]> {
    const raw = await this.redis.zrevrangeWithScores(`leaderboard:weekly:${leagueId}`, 0, limit - 1);
    return Promise.all(
      raw.map(async (entry, idx) => ({
        rank: idx + 1,
        playerId: entry.value,
        username: await this.getUsername(entry.value),
        score: entry.score,
      })),
    );
  }

  async getWeeklyRank(leagueId: string, playerId: string): Promise<number | null> {
    return this.redis.zrank(`leaderboard:weekly:${leagueId}`, playerId);
  }
}
