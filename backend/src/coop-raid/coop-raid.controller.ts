import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { CoopRaidService } from './coop-raid.service';

class CreateRunDto {
  @IsUUID()
  guildId: string;

  @IsUUID()
  leaderId: string;

  @IsOptional()
  @IsInt()
  tzOffsetMinutes?: number;

  @IsOptional()
  @IsBoolean()
  allowOutsideWindow?: boolean;
}

class JoinRunDto {
  @IsUUID()
  userId: string;
}

class DealDamageDto {
  @IsUUID()
  userId: string;

  @IsInt()
  @IsPositive()
  damage: number;
}

@ApiTags('coop-raid')
@Controller('api/v1/coop-raid')
export class CoopRaidController {
  constructor(private readonly coop: CoopRaidService) {}

  @Get('window')
  @ApiOperation({ summary: 'Check whether the co-op raid window is open' })
  window(@Query('tzOffsetMinutes') tzOffsetMinutes?: string) {
    const offset = tzOffsetMinutes ? parseInt(tzOffsetMinutes, 10) : 0;
    return this.coop.isWindowOpen(new Date(), offset);
  }

  @Post('runs')
  @ApiOperation({ summary: 'Create a new co-op raid run for a guild (5-man, 30 min)' })
  createRun(@Body() dto: CreateRunDto) {
    return this.coop.createRun(dto.guildId, dto.leaderId, {
      tzOffsetMinutes: dto.tzOffsetMinutes,
      allowOutsideWindow: dto.allowOutsideWindow,
    });
  }

  @Post('runs/:runId/join')
  @ApiOperation({ summary: 'Join a co-op raid run (max 5 participants)' })
  joinRun(@Param('runId', ParseUUIDPipe) runId: string, @Body() dto: JoinRunDto) {
    return this.coop.joinRun(runId, dto.userId);
  }

  @Post('runs/:runId/damage')
  @ApiOperation({ summary: 'Deal damage to the boss; returns boss state and completion flag' })
  dealDamage(@Param('runId', ParseUUIDPipe) runId: string, @Body() dto: DealDamageDto) {
    return this.coop.dealDamage(runId, dto.userId, dto.damage);
  }

  @Get('runs/:runId')
  @ApiOperation({ summary: 'Get a co-op raid run summary' })
  getRun(@Param('runId', ParseUUIDPipe) runId: string) {
    return this.coop.getRun(runId);
  }

  @Get('runs/:runId/participants')
  @ApiOperation({ summary: 'List participants of a co-op raid run' })
  participants(@Param('runId', ParseUUIDPipe) runId: string) {
    return this.coop.getRunParticipants(runId);
  }

  @Get('guilds/:guildId/runs')
  @ApiOperation({ summary: 'List co-op raid runs for a guild' })
  listGuildRuns(
    @Param('guildId', ParseUUIDPipe) guildId: string,
    @Query('weekKey') weekKey?: string,
  ) {
    return this.coop.listGuildRuns(guildId, weekKey);
  }

  @Post('jobs/expire-stale')
  @ApiOperation({ summary: 'Operator job: mark expired runs' })
  expireStale() {
    return this.coop.expireStaleRuns();
  }
}
