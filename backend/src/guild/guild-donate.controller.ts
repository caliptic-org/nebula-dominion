import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GuildDonateService } from './guild-donate.service';
import { GuildMembershipService } from './guild-membership.service';
import { CreateDonateRequestDto, FulfillDonateRequestDto } from './dto/donate.dto';

@Controller('guilds/:guildId/donate')
@UseGuards(JwtAuthGuard)
export class GuildDonateController {
  constructor(
    private readonly donate: GuildDonateService,
    private readonly membership: GuildMembershipService,
  ) {}

  @Get('requests')
  async list(@Param('guildId') guildId: string, @CurrentUser('sub') userId: string) {
    await this.membership.getMemberInGuild(guildId, userId);
    return this.donate.listOpenRequests(guildId);
  }

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  request(@CurrentUser('sub') userId: string, @Body() dto: CreateDonateRequestDto) {
    return this.donate.createRequest(userId, dto.resourceType, dto.amount);
  }

  @Delete('request/:requestId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@CurrentUser('sub') userId: string, @Param('requestId') requestId: string) {
    return this.donate.cancelRequest(userId, requestId);
  }

  @Post('fulfill')
  @HttpCode(HttpStatus.OK)
  fulfill(@CurrentUser('sub') userId: string, @Body() dto: FulfillDonateRequestDto) {
    return this.donate.fulfill(userId, dto.requestId, dto.amount);
  }
}
