import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GuildChatService } from './guild-chat.service';
import { GuildMembershipService } from './guild-membership.service';
import { SendChatMessageDto, ChatHistoryQueryDto } from './dto/chat.dto';

@Controller('guilds/:guildId/chat')
@UseGuards(JwtAuthGuard)
export class GuildChatController {
  constructor(
    private readonly chat: GuildChatService,
    private readonly membership: GuildMembershipService,
  ) {}

  @Get('window')
  async window(@Param('guildId') guildId: string, @CurrentUser('sub') userId: string) {
    await this.membership.getMemberInGuild(guildId, userId);
    return this.chat.getRollingWindow(guildId);
  }

  @Get('history')
  async history(
    @Param('guildId') guildId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: ChatHistoryQueryDto,
  ) {
    await this.membership.getMemberInGuild(guildId, userId);
    return this.chat.getHistory(guildId, query.before);
  }

  @Post('send')
  async send(
    @Param('guildId') guildId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    await this.membership.getMemberInGuild(guildId, userId);
    return this.chat.sendMessage(userId, dto.content);
  }
}
