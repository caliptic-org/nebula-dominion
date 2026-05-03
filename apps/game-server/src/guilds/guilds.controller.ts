import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { CreateGuildDto } from './dto/create-guild.dto';
import { JoinGuildDto, LeaveGuildDto, DonateDto } from './dto/membership.dto';
import { AdvanceTutorialDto } from './dto/advance-tutorial.dto';

@Controller('guilds')
export class GuildsController {
  constructor(private readonly guilds: GuildsService) {}

  // ─── Guild lifecycle ────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateGuildDto) {
    return this.guilds.createGuild(dto);
  }

  @Get()
  list(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.guilds.listGuilds(
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  @Get('tag/:tag')
  byTag(@Param('tag') tag: string) {
    return this.guilds.findByTag(tag);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.guilds.getGuild(id);
  }

  @Get(':id/members')
  members(@Param('id') id: string) {
    return this.guilds.listMembers(id);
  }

  @Get(':id/events')
  events(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.guilds.listEvents(id, limit ? parseInt(limit, 10) : undefined);
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  join(@Param('id') id: string, @Body() dto: JoinGuildDto) {
    return this.guilds.joinGuild(id, dto.userId);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  async leave(@Param('id') id: string, @Body() dto: LeaveGuildDto) {
    await this.guilds.leaveGuild(id, dto.userId);
    return { ok: true };
  }

  @Post(':id/donate')
  @HttpCode(HttpStatus.OK)
  donate(@Param('id') id: string, @Body() dto: DonateDto) {
    return this.guilds.recordDonation(id, dto.userId, dto.amount);
  }

  // ─── Tutorial state machine ─────────────────────────────────────────────────

  @Get('tutorial/:userId')
  getTutorial(@Param('userId') userId: string) {
    return this.guilds.getTutorialState(userId);
  }

  @Post('tutorial/:userId/advance')
  @HttpCode(HttpStatus.OK)
  advance(@Param('userId') userId: string, @Body() dto: AdvanceTutorialDto) {
    return this.guilds.advanceTutorial(userId, dto.toStep);
  }

  @Post('tutorial/:userId/reward')
  @HttpCode(HttpStatus.OK)
  reward(@Param('userId') userId: string) {
    return this.guilds.grantTutorialReward(userId);
  }

  // ─── User membership lookup ─────────────────────────────────────────────────

  @Get('users/:userId/membership')
  membership(@Param('userId') userId: string) {
    return this.guilds.getUserMembership(userId);
  }
}
