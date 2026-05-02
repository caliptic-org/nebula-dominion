import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { EloService } from './elo.service';
import { GameMode, Race } from './dto/join-queue.dto';
import { v4 as uuidv4 } from 'uuid';

export interface QueueEntry {
  userId: string;
  socketId: string;
  elo: number;
  gamesPlayed: number;
  race: Race;
  mode: GameMode;
  queuedAt: number;
}

export interface MatchResult {
  matchId: string;
  player1: QueueEntry;
  player2: QueueEntry;
}

const QUEUE_KEY = (mode: GameMode) => `matchmaking:queue:${mode}`;
const ENTRY_KEY = (userId: string) => `matchmaking:entry:${userId}`;

@Injectable()
export class MatchmakingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchmakingService.name);
  private redis: Redis;
  private tickTimer: NodeJS.Timeout;

  private readonly initialEloRange: number;
  private readonly eloExpansionRate: number;
  private readonly expansionIntervalMs: number;
  private readonly maxWaitMs: number;
  private readonly tickIntervalMs: number;

  constructor(
    private readonly elo: EloService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {
    this.redis = new Redis(config.get<string>('redisUrl', 'redis://localhost:6379'), {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
    this.initialEloRange = config.get<number>('matchmaking.initialEloRange', 100);
    this.eloExpansionRate = config.get<number>('matchmaking.eloExpansionRate', 50);
    this.expansionIntervalMs = config.get<number>('matchmaking.expansionIntervalMs', 10000);
    this.maxWaitMs = config.get<number>('matchmaking.maxWaitMs', 120000);
    this.tickIntervalMs = config.get<number>('matchmaking.tickIntervalMs', 2000);
  }

  async onModuleInit(): Promise<void> {
    await this.redis.connect();
    this.tickTimer = setInterval(() => this.tick(), this.tickIntervalMs);
    this.logger.log('Matchmaking service started');
  }

  async joinQueue(entry: QueueEntry): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zadd(QUEUE_KEY(entry.mode), entry.elo, entry.userId);
    pipeline.set(
      ENTRY_KEY(entry.userId),
      JSON.stringify(entry),
      'EX',
      Math.ceil(this.maxWaitMs / 1000) + 120,
    );
    await pipeline.exec();
    this.logger.log(`${entry.userId} joined ${entry.mode} queue (ELO ${entry.elo})`);
  }

  async leaveQueue(userId: string, mode?: GameMode): Promise<void> {
    const pipeline = this.redis.pipeline();
    const modes = mode ? [mode] : Object.values(GameMode);
    for (const m of modes) {
      pipeline.zrem(QUEUE_KEY(m), userId);
    }
    pipeline.del(ENTRY_KEY(userId));
    await pipeline.exec();
  }

  async isInQueue(userId: string, mode: GameMode): Promise<boolean> {
    const rank = await this.redis.zrank(QUEUE_KEY(mode), userId);
    return rank !== null;
  }

  async getQueueStats(mode: GameMode): Promise<{ count: number }> {
    const count = await this.redis.zcard(QUEUE_KEY(mode));
    return { count };
  }

  async processQueue(mode: GameMode): Promise<MatchResult[]> {
    const allIds = await this.redis.zrange(QUEUE_KEY(mode), 0, -1);
    if (allIds.length < 2) return [];

    const now = Date.now();
    const entries = await this.loadEntries(allIds);
    const matches: MatchResult[] = [];
    const matched = new Set<string>();

    for (const entry of entries) {
      if (matched.has(entry.userId)) continue;

      const waitMs = now - entry.queuedAt;
      if (waitMs > this.maxWaitMs) {
        await this.leaveQueue(entry.userId, mode);
        this.events.emit('matchmaking.timeout', { userId: entry.userId });
        continue;
      }

      const expansions = Math.floor(waitMs / this.expansionIntervalMs);
      const range = this.initialEloRange + expansions * this.eloExpansionRate;

      const opponent = this.pickBestOpponent(entry, entries, matched, range);
      if (!opponent) continue;

      const matchId = uuidv4();
      matches.push({ matchId, player1: entry, player2: opponent });
      matched.add(entry.userId);
      matched.add(opponent.userId);

      const pipeline = this.redis.pipeline();
      pipeline.zrem(QUEUE_KEY(mode), entry.userId, opponent.userId);
      pipeline.del(ENTRY_KEY(entry.userId), ENTRY_KEY(opponent.userId));
      await pipeline.exec();

      this.logger.log(
        `Match ${matchId}: ${entry.userId}(${entry.elo}) vs ${opponent.userId}(${opponent.elo})`,
      );
    }

    for (const match of matches) {
      this.events.emit('matchmaking.matched', match);
    }

    return matches;
  }

  private pickBestOpponent(
    player: QueueEntry,
    pool: QueueEntry[],
    matched: Set<string>,
    range: number,
  ): QueueEntry | null {
    let best: QueueEntry | null = null;
    let bestDiff = Infinity;

    for (const candidate of pool) {
      if (candidate.userId === player.userId || matched.has(candidate.userId)) continue;
      const diff = Math.abs(player.elo - candidate.elo);
      if (diff <= range && diff < bestDiff) {
        best = candidate;
        bestDiff = diff;
      }
    }

    return best;
  }

  private async loadEntries(userIds: string[]): Promise<QueueEntry[]> {
    if (!userIds.length) return [];
    const values = await this.redis.mget(...userIds.map(ENTRY_KEY));
    return values.filter(Boolean).map((v) => JSON.parse(v!));
  }

  private tick(): void {
    for (const mode of Object.values(GameMode)) {
      this.processQueue(mode).catch((err) =>
        this.logger.error(`Matchmaking tick error for ${mode}`, err.stack),
      );
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.tickTimer);
    this.redis.disconnect();
  }
}
