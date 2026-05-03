import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

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

  private redisCheck(): Promise<string> {
    return new Promise((resolve) => {
      const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
      const url = new URL(redisUrl);
      const host = url.hostname;
      const port = parseInt(url.port || '6379', 10);

      const socket = net.createConnection({ host, port });
      const timer = setTimeout(() => {
        socket.destroy();
        resolve('down');
      }, 3000);

      socket.once('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve('up');
      });

      socket.once('error', () => {
        clearTimeout(timer);
        resolve('down');
      });
    });
  }
}
