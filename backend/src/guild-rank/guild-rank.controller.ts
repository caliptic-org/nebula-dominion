import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { GuildRankService } from './guild-rank.service';

class PublishDto {
  @IsOptional()
  @IsString()
  weekKey?: string;
}

class ApplyBoostDto {
  @IsUUID()
  userId: string;

  @IsInt()
  @IsPositive()
  gemAmount: number;
}

@ApiTags('guild-rank')
@Controller('api/v1/guild-rank')
export class GuildRankController {
  constructor(private readonly rank: GuildRankService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Public weekly guild leaderboard (paginated)' })
  leaderboard(
    @Query('weekKey') weekKey?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 50;
    return this.rank.getLeaderboard(weekKey, p, l);
  }

  @Get('preview')
  @ApiOperation({ summary: 'Live running totals for the current (in-progress) week' })
  preview() {
    return this.rank.previewCurrentWeek();
  }

  @Get('champion/:guildId')
  @ApiOperation({ summary: "Check whether a guild has an active Champion Guild badge" })
  champion(@Param('guildId', ParseUUIDPipe) guildId: string) {
    return this.rank.getActiveChampionBoost(guildId);
  }

  @Post('apply-gem-boost')
  @ApiOperation({
    summary: 'Apply Champion Guild +10% gem revenue boost',
    description: 'Internal helper — call before granting gems. Returns boosted amount.',
  })
  applyBoost(@Body() dto: ApplyBoostDto) {
    return this.rank.applyGemRevenueBoost(dto.userId, dto.gemAmount);
  }

  @Post('jobs/publish')
  @ApiOperation({
    summary: 'Operator job: publish weekly rank for the previous ISO week',
  })
  publish(@Body() dto: PublishDto) {
    return this.rank.publishWeeklyRank(dto.weekKey);
  }
}
