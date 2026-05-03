import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private redis: Redis;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(config.get<string>('redis.url', 'redis://localhost:6379'), {
      lazyConnect: true,
      connectTimeout: 3000,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Full health check (DB + Redis)' })
  async check(): Promise<{ status: string; db: string; redis: string; timestamp: string }> {
    const db = await this.dbCheck();
    const redis = await this.redisCheck();
    const status = db === 'up' && redis === 'up' ? 'ok' : 'degraded';
    return { status, db, redis, timestamp: new Date().toISOString() };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  liveness(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (DB + Redis)' })
  async readiness(): Promise<{ status: string; db: string; redis: string; timestamp: string }> {
    const db = await this.dbCheck();
    const redis = await this.redisCheck();
    const status = db === 'up' && redis === 'up' ? 'ok' : 'degraded';
    return { status, db, redis, timestamp: new Date().toISOString() };
  }

  private async dbCheck(): Promise<string> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async redisCheck(): Promise<string> {
    try {
      await this.redis.ping();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
