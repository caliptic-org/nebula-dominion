import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PvpStats } from './entities/pvp-stats.entity';
import { RedisService } from '../redis/redis.service';
import { PvpShieldService } from '../pvp-shield/pvp-shield.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONSECUTIVE_LOSSES_THRESHOLD = 3;
const COMEBACK_BONUS = {
  mineral: 500,
  gas: 300,
  productionBoostPct: 25,
  productionBoostDurationMinutes: 30,
};

// Initial ±15%, expands to ±25% after 30s wait
const MATCHMAKING_INITIAL_TOLERANCE = 0.15;
const MATCHMAKING_EXPANDED_TOLERANCE = 0.25;
const MATCHMAKING_EXPANSION_THRESHOLD_MS = 30_000;

const QUEUE_TTL_SECONDS = 300; // 5 min max wait
const QUEUE_KEY = 'matchmaking:queue';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BotMatchResult {
  botId: string;
  botPower: number;
  practiceMode: true;
  xpEnabled: true;
  resourcesEnabled: true;
  leaguePointsEnabled: false;
}

export interface QueueEntry {
  queueId: string;
  playerId: string;
  power: number;
  joinedAt: number;
}

export interface QueueJoinResult {
  queueId: string;
  status: 'searching' | 'already_queued';
}

export interface QueueStatus {
  queueId: string;
  matched: boolean;
  status: 'searching' | 'matched' | 'expired';
  waitSeconds?: number;
  opponentId?: string;
  opponentPower?: number;
}

export interface BattleResultResponse {
  playerId: string;
  won: boolean;
  consecutiveLosses: number;
  totalWins: number;
  totalLosses: number;
  comebackBonusTriggered: boolean;
  comebackPackage?: typeof COMEBACK_BONUS;
  botMatchSuggested?: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  constructor(
    @InjectRepository(PvpStats)
    private readonly statsRepo: Repository<PvpStats>,
    private readonly redis: RedisService,
    private readonly shieldService: PvpShieldService,
  ) {}

  // ─── Bot Match ─────────────────────────────────────────────────────────────

  async requestBotMatch(playerId: string, playerPower: number): Promise<BotMatchResult> {
    const shieldActive = await this.shieldService.isShieldActive(playerId);
    if (!shieldActive) {
      throw new BadRequestException(
        'Bot matchmaking is only available while your PvP shield is active (first 7 days)',
      );
    }

    // Bot power is within ±10% of player power, biased slightly below for win guarantee
    const variation = playerPower * 0.10 * Math.random();
    const botPower = Math.max(1, Math.round(playerPower - variation + playerPower * 0.02));
    const botId = `bot_${uuidv4()}`;

    this.logger.log(
      `Bot match for player ${playerId}: playerPower=${playerPower}, botPower=${botPower}`,
    );

    return {
      botId,
      botPower,
      practiceMode: true,
      xpEnabled: true,
      resourcesEnabled: true,
      leaguePointsEnabled: false,
    };
  }

  // ─── Real PvP Queue ────────────────────────────────────────────────────────

  async joinQueue(playerId: string, playerPower: number): Promise<QueueJoinResult> {
    const existingRaw = await this.redis.get(`matchmaking:player:${playerId}`);
    if (existingRaw) {
      const existing: QueueEntry = JSON.parse(existingRaw);
      return { queueId: existing.queueId, status: 'already_queued' };
    }

    const queueId = uuidv4();
    const entry: QueueEntry = { queueId, playerId, power: playerPower, joinedAt: Date.now() };

    await this.redis.zadd(QUEUE_KEY, playerPower, playerId);
    await this.redis.set(
      `matchmaking:player:${playerId}`,
      JSON.stringify(entry),
      QUEUE_TTL_SECONDS,
    );

    this.logger.log(`Player ${playerId} joined matchmaking queue (power=${playerPower})`);
    return { queueId, status: 'searching' };
  }

  async checkQueue(playerId: string): Promise<QueueStatus> {
    const entryRaw = await this.redis.get(`matchmaking:player:${playerId}`);
    if (!entryRaw) {
      return { queueId: '', matched: false, status: 'expired' };
    }

    const entry: QueueEntry = JSON.parse(entryRaw);

    // Check if already matched (another player claimed us)
    const matchedRaw = await this.redis.get(`matchmaking:match:${entry.queueId}`);
    if (matchedRaw) {
      const { opponentId, opponentPower } = JSON.parse(matchedRaw);
      return {
        queueId: entry.queueId,
        matched: true,
        status: 'matched',
        opponentId,
        opponentPower,
      };
    }

    // Try to find an opponent
    const waitMs = Date.now() - entry.joinedAt;
    const tolerance =
      waitMs >= MATCHMAKING_EXPANSION_THRESHOLD_MS
        ? MATCHMAKING_EXPANDED_TOLERANCE
        : MATCHMAKING_INITIAL_TOLERANCE;

    const minPower = entry.power * (1 - tolerance);
    const maxPower = entry.power * (1 + tolerance);

    const candidates = await this.redis.zrangebyscore(QUEUE_KEY, minPower, maxPower);

    for (const candidateId of candidates) {
      if (candidateId === playerId) continue;

      const candidateRaw = await this.redis.get(`matchmaking:player:${candidateId}`);
      if (!candidateRaw) continue;

      const candidate: QueueEntry = JSON.parse(candidateRaw);

      // Claim the opponent: delete their queue entry first (optimistic lock)
      const deleted = await this.redis.del(`matchmaking:player:${candidateId}`);
      if (!deleted) continue; // Another player grabbed them first

      await this.redis.zrem(QUEUE_KEY, candidateId);

      // Store match result for both sides
      const matchData = JSON.stringify({ opponentId: candidateId, opponentPower: candidate.power });
      const myMatchData = JSON.stringify({ opponentId: playerId, opponentPower: entry.power });

      await this.redis.set(`matchmaking:match:${entry.queueId}`, matchData, 120);
      await this.redis.set(`matchmaking:match:${candidate.queueId}`, myMatchData, 120);

      // Clean up our own queue entry
      await this.redis.del(`matchmaking:player:${playerId}`);
      await this.redis.zrem(QUEUE_KEY, playerId);

      this.logger.log(
        `Match found: ${playerId} (power=${entry.power}) vs ${candidateId} (power=${candidate.power}) — tolerance=${tolerance * 100}%`,
      );

      return {
        queueId: entry.queueId,
        matched: true,
        status: 'matched',
        opponentId: candidateId,
        opponentPower: candidate.power,
      };
    }

    return {
      queueId: entry.queueId,
      matched: false,
      status: 'searching',
      waitSeconds: Math.floor(waitMs / 1000),
    };
  }

  async leaveQueue(playerId: string): Promise<void> {
    const entryRaw = await this.redis.get(`matchmaking:player:${playerId}`);
    if (!entryRaw) return;

    await this.redis.del(`matchmaking:player:${playerId}`);
    await this.redis.zrem(QUEUE_KEY, playerId);
    this.logger.log(`Player ${playerId} left matchmaking queue`);
  }

  // ─── PvP Stats & Comeback Bonus ────────────────────────────────────────────

  async recordBattleResult(playerId: string, won: boolean): Promise<BattleResultResponse> {
    let stats = await this.statsRepo.findOne({ where: { playerId } });
    if (!stats) {
      stats = this.statsRepo.create({ playerId });
    }

    if (won) {
      stats.totalWins += 1;
      stats.consecutiveLosses = 0;
    } else {
      stats.totalLosses += 1;
      stats.consecutiveLosses += 1;
    }

    let comebackBonusTriggered = false;
    let comebackPackage: typeof COMEBACK_BONUS | undefined;
    let botMatchSuggested = false;

    if (stats.consecutiveLosses >= CONSECUTIVE_LOSSES_THRESHOLD) {
      comebackBonusTriggered = true;
      comebackPackage = COMEBACK_BONUS;
      botMatchSuggested = true;
      stats.comebackBonusesReceived += 1;
      stats.lastComebackAt = new Date();
      stats.consecutiveLosses = 0; // reset after granting bonus
      this.logger.log(`Comeback bonus triggered for player ${playerId}`);
    }

    const saved = await this.statsRepo.save(stats);

    return {
      playerId,
      won,
      consecutiveLosses: saved.consecutiveLosses,
      totalWins: saved.totalWins,
      totalLosses: saved.totalLosses,
      comebackBonusTriggered,
      comebackPackage,
      botMatchSuggested,
    };
  }

  async getStats(playerId: string): Promise<PvpStats> {
    const stats = await this.statsRepo.findOne({ where: { playerId } });
    if (!stats) throw new NotFoundException(`PvP stats not found for player ${playerId}`);
    return stats;
  }
}
