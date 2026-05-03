import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GuildModerationService } from './guild-moderation.service';
import { ProfanityService } from './profanity.service';
import { ReportStatus } from './entities/guild-report.entity';
import { AddProfanityWordDto, MuteMemberDto, ReportMessageDto } from './dto/moderation.dto';

@Controller('guilds/:guildId/moderation')
@UseGuards(JwtAuthGuard)
export class GuildModerationController {
  constructor(
    private readonly mod: GuildModerationService,
    private readonly profanity: ProfanityService,
  ) {}

  @Post('mute')
  @HttpCode(HttpStatus.OK)
  mute(@CurrentUser('sub') userId: string, @Body() dto: MuteMemberDto) {
    return this.mod.muteMember(userId, dto.userId, dto.durationSeconds, dto.reason);
  }

  @Post('unmute/:targetId')
  @HttpCode(HttpStatus.OK)
  unmute(@CurrentUser('sub') userId: string, @Param('targetId') targetId: string) {
    return this.mod.unmute(userId, targetId);
  }

  @Get('mutes')
  list(@Param('guildId') guildId: string) {
    return this.mod.listActiveMutes(guildId);
  }

  @Post('report')
  @HttpCode(HttpStatus.CREATED)
  report(@CurrentUser('sub') userId: string, @Body() dto: ReportMessageDto) {
    return this.mod.report(userId, dto.targetUserId, dto.reason, dto.messageId);
  }

  @Get('reports')
  reports(
    @CurrentUser('sub') userId: string,
    @Query('status') status?: ReportStatus,
  ) {
    return this.mod.listReports(userId, status);
  }

  @Patch('reports/:reportId')
  resolve(
    @CurrentUser('sub') userId: string,
    @Param('reportId') reportId: string,
    @Body() body: { status: ReportStatus },
  ) {
    return this.mod.resolveReport(userId, reportId, body.status);
  }

  // ─── Profanity word list (admin) ─────────────────────────────────────────────

  @Get('profanity')
  listProfanity() {
    return this.profanity.list();
  }

  @Post('profanity')
  addProfanity(@Body() dto: AddProfanityWordDto) {
    return this.profanity.addWord(dto.word);
  }
}
