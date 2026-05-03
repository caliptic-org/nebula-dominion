import { Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InactiveGuardService } from './inactive-guard.service';

@ApiTags('inactive-guard')
@Controller('api/v1/inactive-guard')
export class InactiveGuardController {
  constructor(private readonly guard: InactiveGuardService) {}

  @Post('jobs/scan')
  @ApiOperation({
    summary: 'Operator job: run inactive guard scan (mark / auto-kick / archive)',
  })
  scan() {
    return this.guard.scan();
  }

  @Get('guilds/:guildId/kick-eligible')
  @ApiOperation({ summary: 'List members marked as kick-eligible (≥14 days inactive)' })
  listEligible(@Param('guildId', ParseUUIDPipe) guildId: string) {
    return this.guard.listKickEligible(guildId);
  }

  @Delete('guilds/:guildId/members/:userId')
  @ApiOperation({ summary: 'Leader manual one-click kick of a kick-eligible member' })
  kick(
    @Param('guildId', ParseUUIDPipe) guildId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.guard.manualKick(guildId, userId);
  }

  @Get('guilds/:guildId/history')
  @ApiOperation({ summary: 'Inactive-guard markers history for a guild' })
  history(@Param('guildId', ParseUUIDPipe) guildId: string) {
    return this.guard.getGuildArchiveHistory(guildId);
  }
}
