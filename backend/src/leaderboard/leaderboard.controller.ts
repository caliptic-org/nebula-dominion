import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { UpdateScoreDto } from './dto/leaderboard-query.dto';

@ApiTags('leaderboard')
@Controller({ path: 'leaderboard', version: '1' })
export class LeaderboardController {
  constructor(private readonly svc: LeaderboardService) {}

  // ─── Global ──────────────────────────────────────────────────────────────────

  @Get('global')
  @ApiOperation({ summary: 'Get global leaderboard (Redis sorted set)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top players by global score' })
  getGlobal(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.svc.getGlobalLeaderboard(Math.min(limit, 200), offset);
  }

  @Get('global/total')
  @ApiOperation({ summary: 'Total number of ranked players' })
  getGlobalTotal() {
    return this.svc.getGlobalTotal().then((total) => ({ total }));
  }

  @Get('global/:playerId')
  @ApiOperation({ summary: 'Get a specific player global rank and score' })
  @ApiParam({ name: 'playerId', type: 'string', format: 'uuid' })
  getGlobalRank(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.svc.getGlobalRank(playerId);
  }

  @Post('global/score')
  @ApiOperation({ summary: 'Add delta to a player global score (internal)' })
  @ApiResponse({ status: 201, description: 'New score returned' })
  addGlobalScore(@Body() dto: UpdateScoreDto) {
    return this.svc
      .addGlobalScore(dto.playerId, dto.username, dto.delta)
      .then((score) => ({ score }));
  }

  // ─── Sector ──────────────────────────────────────────────────────────────────

  @Get('sector/:sectorId')
  @ApiOperation({ summary: 'Get sector leaderboard by player contribution score' })
  @ApiParam({ name: 'sectorId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getSectorLeaderboard(
    @Param('sectorId', ParseUUIDPipe) sectorId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.svc.getSectorLeaderboard(sectorId, Math.min(limit, 100));
  }

  @Get('sector/:sectorId/rank/:playerId')
  @ApiOperation({ summary: 'Get a player rank within a specific sector' })
  @ApiParam({ name: 'sectorId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'playerId', type: 'string', format: 'uuid' })
  getSectorRank(
    @Param('sectorId', ParseUUIDPipe) sectorId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.svc.getSectorRank(sectorId, playerId).then((rank) => ({ rank }));
  }

  // ─── Weekly ───────────────────────────────────────────────────────────────────

  @Get('weekly/:leagueId')
  @ApiOperation({ summary: 'Get weekly league leaderboard (Redis sorted set)' })
  @ApiParam({ name: 'leagueId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getWeekly(
    @Param('leagueId', ParseUUIDPipe) leagueId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.svc.getWeeklyLeaderboard(leagueId, Math.min(limit, 200));
  }

  @Get('weekly/:leagueId/rank/:playerId')
  @ApiOperation({ summary: 'Get player rank within a weekly league' })
  @ApiParam({ name: 'leagueId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'playerId', type: 'string', format: 'uuid' })
  getWeeklyRank(
    @Param('leagueId', ParseUUIDPipe) leagueId: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.svc.getWeeklyRank(leagueId, playerId).then((rank) => ({ rank }));
  }

  @Post('weekly/:leagueId/score')
  @ApiOperation({ summary: 'Add delta to a player weekly league score (internal)' })
  @ApiParam({ name: 'leagueId', type: 'string', format: 'uuid' })
  addWeeklyScore(@Param('leagueId', ParseUUIDPipe) leagueId: string, @Body() dto: UpdateScoreDto) {
    return this.svc
      .addWeeklyScore(leagueId, dto.playerId, dto.username, dto.delta)
      .then((score) => ({ score }));
  }
}
