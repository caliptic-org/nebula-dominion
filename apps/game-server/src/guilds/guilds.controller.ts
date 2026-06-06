import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { GuildRaidsService } from './guild-raids.service';
import { GuildResearchService } from './guild-research.service';
import { CreateGuildDto } from './dto/create-guild.dto';
import { JoinGuildDto, LeaveGuildDto, DonateDto } from './dto/membership.dto';
import { AdvanceTutorialDto } from './dto/advance-tutorial.dto';
import { RaidAttackDto } from './dto/raid.dto';
import { ResearchContributeDto, StartResearchDto } from './dto/research.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

/**
 * GuildsController — JWT-guarded as of P5-S1 (audit blocker).
 *
 * Previously this controller had NO authentication at all: every endpoint
 * was anonymously callable, and write endpoints trusted a `userId` field
 * from the request body or URL path. That meant an attacker could:
 *   - POST /api/guilds/<id>/join {userId:'<victim>'} to force a player
 *     into a guild against their will,
 *   - POST /api/guilds/tutorial/<victim>/reward to drain the victim's
 *     one-shot tutorial reward,
 *   - POST /api/guilds/raids/<id>/attack {userId:'<victim>'} to credit
 *     fake raid damage against another player's account, etc.
 *
 * Mitigation:
 *   1. @UseGuards(HttpJwtGuard) at the class level — every endpoint now
 *      requires a valid Bearer token signed with the shared JWT secret.
 *   2. The acting user identity is taken EXCLUSIVELY from the JWT
 *      subject claim via @CurrentUser(). The body/path userId fields
 *      have been removed from the DTOs (see dto/*.ts).
 *   3. Tutorial endpoints lost their /:userId path segment — the user
 *      is derived from the token, not the URL.
 *
 * Service-layer signatures intentionally still take `userId: string` as
 * their first argument; only the SOURCE of that string changed (JWT
 * instead of attacker-controlled input). Read-only `GET` endpoints over
 * public guild data (list, members, events, raid drops) are still
 * exposed but now require any valid login token — that's an acceptable
 * scope reduction; we can relax specific GETs later if a logged-out
 * "browse" UX becomes a product requirement.
 */
@UseGuards(HttpJwtGuard)
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
  join(
    @Param('id') id: string,
    @Body() _dto: JoinGuildDto,
    @CurrentUser() userId: string,
  ) {
    return this.guilds.joinGuild(id, userId);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  async leave(
    @Param('id') id: string,
    @Body() _dto: LeaveGuildDto,
    @CurrentUser() userId: string,
  ) {
    await this.guilds.leaveGuild(id, userId);
    return { ok: true };
  }

  @Post(':id/donate')
  @HttpCode(HttpStatus.OK)
  donate(
    @Param('id') id: string,
    @Body() dto: DonateDto,
    @CurrentUser() userId: string,
  ) {
    return this.guilds.recordDonation(id, userId, dto.amount);
  }

  // ─── Tutorial state machine ─────────────────────────────────────────────────
  //
  // The :userId path segment was REMOVED from /tutorial/* endpoints —
  // a player can only read or advance THEIR OWN tutorial state, which
  // comes from the JWT.

  @Get('tutorial')
  getTutorial(@CurrentUser() userId: string) {
    return this.guilds.getTutorialState(userId);
  }

  @Post('tutorial/advance')
  @HttpCode(HttpStatus.OK)
  advance(@Body() dto: AdvanceTutorialDto, @CurrentUser() userId: string) {
    return this.guilds.advanceTutorial(userId, dto.toStep);
  }

  @Post('tutorial/reward')
  @HttpCode(HttpStatus.OK)
  reward(@CurrentUser() userId: string) {
    return this.guilds.grantTutorialReward(userId);
  }

  // ─── User membership lookup ─────────────────────────────────────────────────
  //
  // F-CYCLE3-05 / C4-4 (IDOR fix): callers can only read THEIR OWN membership,
  // essence balance, and weekly-cap usage. The caller is identified by the JWT
  // subject claim via @CurrentUser(); the URL no longer accepts a userId path
  // segment that could be spoofed.
  //
  // Legacy `/guilds/users/:userId/*` routes are retained as deprecated aliases
  // that 403 when the URL userId does not match the JWT subject, so existing
  // clients fail loudly instead of silently leaking another player's data. The
  // aliases can be deleted in a follow-up once all callers migrate.

  @Get('me/membership')
  myMembership(@CurrentUser() userId: string) {
    return this.guilds.getUserMembership(userId);
  }

  @Get('users/:userId/membership')
  membership(
    @Param('userId') pathUserId: string,
    @CurrentUser() userId: string,
  ) {
    if (pathUserId !== userId) {
      throw new ForbiddenException('Cannot read another user\'s membership');
    }
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
  attackRaid(
    @Param('raidId') raidId: string,
    @Body() dto: RaidAttackDto,
    @CurrentUser() userId: string,
  ) {
    return this.raids.attack(raidId, userId, dto.damage);
  }

  @Post('raids/:raidId/resolve-drops')
  @HttpCode(HttpStatus.OK)
  resolveDrops(@Param('raidId') raidId: string) {
    return this.raids.resolveDrops(raidId);
  }

  @Get('me/essence')
  myEssenceBalance(@CurrentUser() userId: string) {
    return this.raids.getEssenceBalance(userId);
  }

  @Get('me/essence/weekly')
  myEssenceWeekly(@CurrentUser() userId: string) {
    return this.raids.getWeeklyEssenceUsage(userId);
  }

  // Deprecated IDOR-safe aliases — see comment near `me/membership`.

  @Get('users/:userId/essence')
  essenceBalance(
    @Param('userId') pathUserId: string,
    @CurrentUser() userId: string,
  ) {
    if (pathUserId !== userId) {
      throw new ForbiddenException('Cannot read another user\'s essence balance');
    }
    return this.raids.getEssenceBalance(userId);
  }

  @Get('users/:userId/essence/weekly')
  essenceWeekly(
    @Param('userId') pathUserId: string,
    @CurrentUser() userId: string,
  ) {
    if (pathUserId !== userId) {
      throw new ForbiddenException('Cannot read another user\'s essence usage');
    }
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
  startResearch(
    @Param('id') id: string,
    @Body() dto: StartResearchDto,
    @CurrentUser() userId: string,
  ) {
    return this.research.startResearch({
      guildId: id,
      researchId: dto.researchId,
      level: dto.level,
      selectedBy: userId,
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
    @CurrentUser() userId: string,
  ) {
    return this.research.contribute({
      researchStateId: stateId,
      userId,
      xp: dto.xp,
    });
  }
}
