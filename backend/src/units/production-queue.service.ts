import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface ProductionJob {
  jobId: string;
  playerId: string;
  unitTypeId: string;
  unitTypeCode: string;
  queuedAt: number;
  completesAt: number;
}

@Injectable()
export class ProductionQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProductionQueueService.name);
  private redis: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD') || undefined,
      db: this.config.get<number>('REDIS_DB', 0),
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.redis.connect().catch((err) => {
      this.logger.error(`Redis connect failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  private queueKey(playerId: string): string {
    return `prod_queue:${playerId}`;
  }

  private jobKey(playerId: string, jobId: string): string {
    return `prod_job:${playerId}:${jobId}`;
  }

  async enqueue(job: ProductionJob): Promise<void> {
    const pipeline = this.redis.pipeline();
    // Sorted set: score = completesAt (Unix ms), member = jobId
    pipeline.zadd(this.queueKey(job.playerId), job.completesAt, job.jobId);
    // Hash: full job data
    pipeline.set(this.jobKey(job.playerId, job.jobId), JSON.stringify(job), 'PX', 86_400_000);
    await pipeline.exec();
    this.logger.debug(`Enqueued job ${job.jobId} for player ${job.playerId}, completes at ${new Date(job.completesAt).toISOString()}`);
  }

  async getCompletedJobs(playerId: string): Promise<ProductionJob[]> {
    const now = Date.now();
    // Get all job IDs with score <= now (completed)
    const jobIds = await this.redis.zrangebyscore(this.queueKey(playerId), 0, now);
    if (!jobIds.length) return [];

    const pipeline = this.redis.pipeline();
    for (const jobId of jobIds) {
      pipeline.get(this.jobKey(playerId, jobId));
    }
    const results = await pipeline.exec();

    const jobs: ProductionJob[] = [];
    for (const [err, raw] of results || []) {
      if (!err && raw) {
        try {
          jobs.push(JSON.parse(raw as string) as ProductionJob);
        } catch {
          // malformed entry — skip
        }
      }
    }
    return jobs;
  }

  async removeJob(playerId: string, jobId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zrem(this.queueKey(playerId), jobId);
    pipeline.del(this.jobKey(playerId, jobId));
    await pipeline.exec();
  }

  async cancelJob(playerId: string, jobId: string): Promise<boolean> {
    const raw = await this.redis.get(this.jobKey(playerId, jobId));
    if (!raw) return false;
    await this.removeJob(playerId, jobId);
    return true;
  }

  async getQueuedJobs(playerId: string): Promise<Array<{ job: ProductionJob; remainingSeconds: number }>> {
    const now = Date.now();
    // Get all pending (not yet completed) jobs
    const entries = await this.redis.zrangebyscoreBuffer(
      this.queueKey(playerId),
      now + 1,
      '+inf',
      'WITHSCORES',
    );

    const result: Array<{ job: ProductionJob; remainingSeconds: number }> = [];
    for (let i = 0; i < entries.length; i += 2) {
      const jobId = entries[i].toString();
      const completesAt = parseInt(entries[i + 1].toString(), 10);
      const raw = await this.redis.get(this.jobKey(playerId, jobId));
      if (raw) {
        try {
          const job = JSON.parse(raw) as ProductionJob;
          result.push({
            job,
            remainingSeconds: Math.max(0, Math.ceil((completesAt - now) / 1000)),
          });
        } catch {
          // skip
        }
      }
    }
    return result;
  }

  async getQueueLength(playerId: string): Promise<number> {
    return this.redis.zcard(this.queueKey(playerId));
  }

  async clearPlayerQueue(playerId: string): Promise<void> {
    const allJobIds = await this.redis.zrange(this.queueKey(playerId), 0, -1);
    if (allJobIds.length) {
      const pipeline = this.redis.pipeline();
      for (const jobId of allJobIds) {
        pipeline.del(this.jobKey(playerId, jobId));
      }
      pipeline.del(this.queueKey(playerId));
      await pipeline.exec();
    }
  }
}
