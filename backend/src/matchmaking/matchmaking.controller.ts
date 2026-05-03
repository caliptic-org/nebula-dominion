import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsPositive, IsBoolean, Min } from 'class-validator';
import { MatchmakingService } from './matchmaking.service';

class BotMatchDto {
  @IsUUID()
  playerId: string;

  @IsNumber()
  @IsPositive()
  playerPower: number;
}

class JoinQueueDto {
  @IsUUID()
  playerId: string;

  @IsNumber()
  @Min(1)
  playerPower: number;
}

class BattleResultDto {
  @IsBoolean()
  won: boolean;
}

@ApiTags('matchmaking')
@Controller('api/v1/matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  // ─── Bot Match ─────────────────────────────────────────────────────────────

  @Post('bot')
  @ApiOperation({
    summary: 'Request a bot practice match (shield-protected players only)',
    description:
      'Returns a bot opponent with power within ±10% of the player. Practice mode: grants XP and resources but NO league points.',
  })
  @ApiResponse({ status: 201, description: 'Bot match created' })
  requestBotMatch(@Body() dto: BotMatchDto) {
    return this.matchmakingService.requestBotMatch(dto.playerId, dto.playerPower);
  }

  // ─── Real PvP Queue ────────────────────────────────────────────────────────

  @Post('queue')
  @ApiOperation({
    summary: 'Join the real PvP matchmaking queue',
    description:
      'Searches for opponents within ±15% power. After 30s, tolerance expands to ±25%. Poll GET /queue/:playerId to check status.',
  })
  @ApiResponse({ status: 201, description: 'Joined queue' })
  joinQueue(@Body() dto: JoinQueueDto) {
    return this.matchmakingService.joinQueue(dto.playerId, dto.playerPower);
  }

  @Get('queue/:playerId')
  @ApiOperation({
    summary: 'Check matchmaking queue status',
    description:
      'Returns matched=true with opponentId when a match is found. Also triggers opponent search on each poll.',
  })
  checkQueue(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.matchmakingService.checkQueue(playerId);
  }

  @Delete('queue/:playerId')
  @ApiOperation({ summary: 'Leave the matchmaking queue' })
  leaveQueue(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.matchmakingService.leaveQueue(playerId);
  }

  // ─── PvP Stats & Comeback Bonus ────────────────────────────────────────────

  @Post('stats/:playerId/battle-result')
  @ApiOperation({
    summary: 'Record a PvP battle result and check for comeback bonus',
    description:
      'Tracks consecutive losses. After 3 consecutive losses, a Comeback Package is automatically granted: +500 Mineral, +300 Gas, 30min ×25% production boost.',
  })
  @ApiResponse({ status: 201, description: 'Result recorded; comebackBonusTriggered flag indicates bonus' })
  recordBattleResult(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: BattleResultDto,
  ) {
    return this.matchmakingService.recordBattleResult(playerId, dto.won);
  }

  @Get('stats/:playerId')
  @ApiOperation({ summary: 'Get PvP stats for a player' })
  getStats(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.matchmakingService.getStats(playerId);
  }
}
