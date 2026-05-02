import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private redis: Redis;

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(config.get<string>('redis.url', 'redis://localhost:6379'), {
      lazyConnect: true,
      connectTimeout: 3000,
    });
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check (DB + Redis)' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redisCheck(),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  liveness(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe (DB + Redis)' })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redisCheck(),
    ]);
  }

  private async redisCheck(): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();
      return { redis: { status: 'up' } };
    } catch {
      return { redis: { status: 'down' } };
    }
  }
}
