import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GuildSuggestionService, SUGGESTION_DEFAULT_LIMIT } from './guild-suggestion.service';
import { GuildMembershipService } from './guild-membership.service';

@Controller('guilds')
@UseGuards(JwtAuthGuard)
export class GuildSuggestionController {
  constructor(
    private readonly suggestion: GuildSuggestionService,
    private readonly membership: GuildMembershipService,
  ) {}

  @Get('suggestions')
  async list(
    @CurrentUser('sub') userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.suggestion.suggest(userId, limit ?? SUGGESTION_DEFAULT_LIMIT);
  }

  @Post(':guildId/join')
  @HttpCode(HttpStatus.CREATED)
  join(
    @CurrentUser('sub') userId: string,
    @Param('guildId', new ParseUUIDPipe()) guildId: string,
  ) {
    return this.membership.joinGuild(userId, guildId);
  }

  @Post('quick-join')
  @HttpCode(HttpStatus.CREATED)
  quickJoin(@CurrentUser('sub') userId: string) {
    return this.membership.quickJoin(userId);
  }
}
