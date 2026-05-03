import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('power-breakdown')
  @ApiOperation({ summary: 'Get power breakdown by commander, research, and unit contributions' })
  @ApiResponse({ status: 200, description: 'Power breakdown with percentages and race color token' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getPowerBreakdown(@Req() req: any) {
    return this.statsService.getPowerBreakdown(req.userId);
  }

  @Get('buffs/active')
  @ApiOperation({ summary: 'Get active buffs for the authenticated player (max 6)' })
  @ApiResponse({ status: 200, description: 'Active buff list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getActiveBuffs(@Req() req: any) {
    return this.statsService.getActiveBuffs(req.userId);
  }

  @Get('battle')
  @ApiOperation({ summary: 'Get battle statistics with delta compared to previous period' })
  @ApiResponse({ status: 200, description: 'Battle stats with win rate and delta' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getBattleStats(@Req() req: any) {
    return this.statsService.getBattleStats(req.userId);
  }

  @Get('resources/rates')
  @ApiOperation({ summary: 'Get resource production rates with delta compared to previous period' })
  @ApiResponse({ status: 200, description: 'Resource production rates' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No resource data found' })
  getResourceRates(@Req() req: any) {
    return this.statsService.getResourceRates(req.userId);
  }
}
