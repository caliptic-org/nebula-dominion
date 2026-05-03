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
import { GuildRaidsService } from './guild-raids.service';
import { GuildResearchService } from './guild-research.service';
import { CreateGuildDto } from './dto/create-guild.dto';
import { JoinGuildDto, LeaveGuildDto, DonateDto } from './dto/membership.dto';
import { AdvanceTutorialDto } from './dto/advance-tutorial.dto';
import { RaidAttackDto } from './dto/raid.dto';
import { ResearchContributeDto, StartResearchDto } from './dto/research.dto';

@Controller('guilds')
export class GuildsController {
  constructor(
    private readonly guilds: GuildsService,
    private readonly raids: GuildRaidsService,
    private readonly research: GuildResearchService,
  ) {}

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

  // ─── Raids (CAL-240) ────────────────────────────────────────────────────────

  @Get(':id/raids/current')
  currentRaid(@Param('id') id: string) {
    return this.raids.getCurrentRaid(id);
  }

  @Get(':id/raids')
  listRaids(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.raids.listRaids(id, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('raids/:raidId')
  getRaid(@Param('raidId') raidId: string) {
    return this.raids.getRaid(raidId);
  }

  @Get('raids/:raidId/contributions')
  raidContributions(@Param('raidId') raidId: string) {
    return this.raids.listContributions(raidId);
  }

  @Get('raids/:raidId/drops')
  raidDrops(@Param('raidId') raidId: string) {
    return this.raids.listDrops(raidId);
  }

  @Post('raids/:raidId/attack')
  @HttpCode(HttpStatus.OK)
  attackRaid(@Param('raidId') raidId: string, @Body() dto: RaidAttackDto) {
    return this.raids.attack(raidId, dto.userId, dto.damage);
  }

  @Post('raids/:raidId/resolve-drops')
  @HttpCode(HttpStatus.OK)
  resolveDrops(@Param('raidId') raidId: string) {
    return this.raids.resolveDrops(raidId);
  }

  @Get('users/:userId/essence')
  essenceBalance(@Param('userId') userId: string) {
    return this.raids.getEssenceBalance(userId);
  }

  @Get('users/:userId/essence/weekly')
  essenceWeekly(@Param('userId') userId: string) {
    return this.raids.getWeeklyEssenceUsage(userId);
  }

  // ─── Research / Tech ağacı (CAL-240) ────────────────────────────────────────

  @Get('research/catalog')
  researchCatalog() {
    return this.research.catalog();
  }

  @Get(':id/research')
  guildResearch(@Param('id') id: string) {
    return this.research.listGuildResearch(id);
  }

  @Get(':id/research/active')
  guildResearchActive(@Param('id') id: string) {
    return this.research.getActiveSlots(id);
  }

  @Get(':id/research/buffs')
  guildBuffs(@Param('id') id: string) {
    return this.research.getGuildBuffs(id);
  }

  @Post(':id/research/start')
  @HttpCode(HttpStatus.CREATED)
  startResearch(@Param('id') id: string, @Body() dto: StartResearchDto) {
    return this.research.startResearch({
      guildId: id,
      researchId: dto.researchId,
      level: dto.level,
      selectedBy: dto.selectedBy,
    });
  }

  @Get('research/:stateId')
  getResearch(@Param('stateId') stateId: string) {
    return this.research.getResearchState(stateId);
  }

  @Get('research/:stateId/contributions')
  researchContributions(@Param('stateId') stateId: string) {
    return this.research.listContributions(stateId);
  }

  @Post('research/:stateId/contribute')
  @HttpCode(HttpStatus.OK)
  contributeResearch(
    @Param('stateId') stateId: string,
    @Body() dto: ResearchContributeDto,
  ) {
    return this.research.contribute({
      researchStateId: stateId,
      userId: dto.userId,
      xp: dto.xp,
    });
  }
}
