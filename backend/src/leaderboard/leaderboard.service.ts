import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

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

const KEYS = {
  global: 'leaderboard:global',
  sector: (sectorId: string) => `leaderboard:sector:${sectorId}`,
  usernames: 'leaderboard:usernames',
};

// TTL for sector leaderboards (24 h) — global never expires
const SECTOR_LB_TTL = 86400;

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private readonly redis: RedisService) {}

  // ─── Write helpers ─────────────────────────────────────────────────────────

  async recordUsername(playerId: string, username: string): Promise<void> {
    await this.redis.set(`${KEYS.usernames}:${playerId}`, username);
  }

  private async getUsername(playerId: string): Promise<string> {
    return (await this.redis.get(`${KEYS.usernames}:${playerId}`)) ?? playerId.slice(0, 8);
  }

  // ─── Global leaderboard ────────────────────────────────────────────────────

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

  // ─── Sector leaderboard ────────────────────────────────────────────────────

  async addSectorScore(sectorId: string, playerId: string, username: string, delta: number): Promise<number> {
    await this.recordUsername(playerId, username);
    const key = KEYS.sector(sectorId);
    const newScore = await this.redis.zincrby(key, delta, playerId);
    // Refresh TTL on every write
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

  // ─── Weekly leaderboard (by leagueId) ─────────────────────────────────────

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
