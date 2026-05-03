import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      db: this.config.get<number>('REDIS_DB', 0),
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.client.on('error', (err) => this.logger.error('Redis error', err.message));
    this.client.on('connect', () => this.logger.log('Redis connected'));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count === 1;
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  // ─── Sorted-set helpers (leaderboards) ──────────────────────────────────────

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    const result = await this.client.zincrby(key, increment, member);
    return parseFloat(result);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const raw = await this.client.zscore(key, member);
    return raw !== null ? parseFloat(raw) : null;
  }

  async zrank(key: string, member: string): Promise<number | null> {
    const rank = await this.client.zrevrank(key, member);
    return rank !== null ? rank + 1 : null;
  }

  async zrevrangeWithScores(
    key: string,
    start: number,
    stop: number,
  ): Promise<Array<{ value: string; score: number }>> {
    const raw = await this.client.zrevrange(key, start, stop, 'WITHSCORES');
    const result: Array<{ value: string; score: number }> = [];
    for (let i = 0; i < raw.length; i += 2) {
      result.push({ value: raw[i], score: parseFloat(raw[i + 1]) });
    }
    return result;
  }

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<void> {
    await this.client.zremrangebyscore(key, min, max);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }
}
