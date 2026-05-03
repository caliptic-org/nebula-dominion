import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { BatchTrackEventDto, TrackEventDto } from './dto/track-event.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('event')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track a single client-side analytics event' })
  @ApiResponse({ status: 204, description: 'Event accepted' })
  async trackEvent(@Body() dto: TrackEventDto): Promise<void> {
    await this.analyticsService.track(dto);
  }

  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track a batch of client-side analytics events' })
  @ApiResponse({ status: 204, description: 'Events accepted' })
  async trackEvents(@Body() dto: BatchTrackEventDto): Promise<void> {
    await this.analyticsService.trackBatch(dto.events);
  }
}
