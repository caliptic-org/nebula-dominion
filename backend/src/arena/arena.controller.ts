import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ArenaService } from './arena.service';

class JoinQueueDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsInt()
  tzOffsetMinutes?: number;

  @IsOptional()
  @IsBoolean()
  allowOutsideWindow?: boolean;
}

class MatchResultDto {
  @IsUUID()
  winnerId: string;

  @IsUUID()
  loserId: string;
}

@ApiTags('arena')
@Controller('api/v1/arena')
export class ArenaController {
  constructor(private readonly arena: ArenaService) {}

  @Get('window')
  @ApiOperation({ summary: 'Check whether the arena window is currently open' })
  window(@Query('tzOffsetMinutes') tzOffsetMinutes?: string) {
    const offset = tzOffsetMinutes ? parseInt(tzOffsetMinutes, 10) : 0;
    return this.arena.isWindowOpen(new Date(), offset);
  }

  @Post('queue')
  @ApiOperation({
    summary: 'Join arena matchmaking queue (MMR ±100, expands to ±200 after 30s)',
  })
  joinQueue(@Body() dto: JoinQueueDto) {
    return this.arena.joinQueue(dto.userId, {
      tzOffsetMinutes: dto.tzOffsetMinutes,
      allowOutsideWindow: dto.allowOutsideWindow,
    });
  }

  @Get('queue/:userId')
  @ApiOperation({ summary: 'Poll arena queue status' })
  checkQueue(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.arena.checkQueue(userId);
  }

  @Delete('queue/:userId')
  @ApiOperation({ summary: 'Leave the arena queue' })
  leaveQueue(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.arena.leaveQueue(userId);
  }

  @Post('match-result')
  @ApiOperation({
    summary: 'Record arena match result (MMR delta, gem reward, arena points)',
  })
  recordResult(@Body() dto: MatchResultDto) {
    return this.arena.recordMatchResult({ winnerId: dto.winnerId, loserId: dto.loserId });
  }

  @Get('stats/:userId')
  @ApiOperation({ summary: 'Get arena stats for a player' })
  getStats(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.arena.getStats(userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Weekly arena leaderboard (paginated)' })
  leaderboard(
    @Query('weekKey') weekKey?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const lim = limit ? Math.min(200, Math.max(1, parseInt(limit, 10))) : 50;
    const off = offset ? Math.max(0, parseInt(offset, 10)) : 0;
    return this.arena.weeklyLeaderboard(weekKey, lim, off);
  }

  @Post('jobs/reset-daily-counters')
  @ApiOperation({ summary: 'Operator job: reset arena daily match counters' })
  resetDaily() {
    return this.arena.resetDailyCounters();
  }
}
