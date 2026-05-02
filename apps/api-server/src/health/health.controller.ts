import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check — returns database connectivity status' })
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe — returns 200 if process is alive' })
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
