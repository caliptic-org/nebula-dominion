import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { IngestEventsDto } from './dto/ingest-events.dto';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

@ApiTags('telemetry')
@Controller('api/v1/events')
@UseGuards(ApiKeyGuard, RateLimitGuard)
@ApiHeader({ name: 'x-telemetry-key', description: 'Telemetry API key (required when TELEMETRY_API_KEY env is set)', required: false })
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post()
  @ApiOperation({ summary: 'Ingest funnel events (batch, max 50 per request)' })
  @ApiResponse({ status: 201, description: 'Events stored' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async ingestEvents(@Body() dto: IngestEventsDto) {
    return this.telemetryService.ingestBatch(dto.events);
  }

  @Get('retention')
  @ApiOperation({ summary: 'D1/D7/D30 cohort retention table' })
  async getCohortRetention() {
    return this.telemetryService.getRetentionCohorts();
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Onboarding funnel step completion rates' })
  async getOnboardingFunnel() {
    return this.telemetryService.getOnboardingFunnel();
  }

  @Get('battle-load-times')
  @ApiOperation({ summary: 'Battle loading time percentiles (P50/P90/P99) by day' })
  async getBattleLoadTimes() {
    return this.telemetryService.getBattleLoadTimes();
  }
}
