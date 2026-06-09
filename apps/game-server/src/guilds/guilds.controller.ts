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
import { InternalServiceGuard } from '../auth/internal-service.guard';
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
 *   1. @UseGuards(HttpJwtGuard) applied per-endpoint — every player-
 *      facing endpoint requires a valid Bearer token signed with the
 *      shared JWT secret. (Previously this was a class-level decorator;
 *      audit cycle 6 HIGH ECON-CYC6-02 forced us to move it to per-route
 *      so the new `/raids/:raidId/attack` endpoint can be gated by
 *      `InternalServiceGuard` instead — Nest composes class-level + method-
 *      level guards with AND semantics, so a single endpoint cannot
 *      override the class-level one. Mirroring the per-route pattern
 *      buildings.controller.ts already uses.)
 *   2. The acting user identity is taken EXCLUSIVELY from the JWT
 *      subject claim via @CurrentUser(). The body/path userId fields
 *      have been removed from the DTOs (see dto/*.ts). The lone
 *      exception is the internal-service-only attackRaid endpoint,
 *      which takes `userId` from the body because internal callers do
 *      not carry a player JWT.
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
@Controller('guilds')
export class GuildsController {
  constructor(
    private readonly guilds: GuildsService,
    private readonly raids: GuildRaidsService,
    private readonly research: GuildResearchService,
  ) {}

  // ─── Guild lifecycle ────────────────────────────────────────────────────────

  /**
   * Create a new guild with the caller as its leader.
   *
   * BLOCKER IDOR-GUILDS-CREATE-LEADER (audit cycle 6):
   *   Previously this handler trusted `dto.leaderId` from the request body
   *   and passed it to GuildsService.createGuild as the new guild's
   *   leader. That meant any authenticated player could POST
   *   `{name, tag, leaderId: <victim_uuid>}` and conscript the victim as
   *   the leader of a guild the attacker had just created — pinning the
   *   victim to that guild (the service's `existingMembership` check then
   *   prevented them from joining any real guild), forging GuildEvent
   *   rows in the victim's name, and emitting telemetry attributed to
   *   the victim.
   *
   * Mitigation:
   *   `leaderId` has been removed from CreateGuildDto. The leader is now
   *   taken from the JWT subject claim via @CurrentUser() and passed as
   *   the second argument to GuildsService.createGuild(). This mirrors
   *   the pattern already used by `join`, `leave`, and `donate` below
   *   (and `attackRaid`, `startResearch`, `contributeResearch` further
   *   down), where the URL/body never carries a userId.
   */
  @Post()
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateGuildDto, @CurrentUser() userId: string) {
    return this.guilds.createGuild(dto, userId);
  }

  @Get()
  @UseGuards(HttpJwtGuard)
  list(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.guilds.listGuilds(
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  @Get('tag/:tag')
  @UseGuards(HttpJwtGuard)
  byTag(@Param('tag') tag: string) {
    return this.guilds.findByTag(tag);
  }

  @Get(':id')
  @UseGuards(HttpJwtGuard)
  get(@Param('id') id: string) {
    return this.guilds.getGuild(id);
  }

  /**
   * GET /guilds/:id/members — list roster rows for the target guild.
   *
   * HIGH IDOR-GUILDS-MEMBERS-ENUM-01 (audit cycle 8 fix):
   *   Previously this handler had only `HttpJwtGuard` and called
   *   `guilds.listMembers(id)` with NO caller identity. That meant any
   *   logged-in player could enumerate every rival guild's full roster —
   *   each row exposes `{userId, role, joinedAt, contributionPts,
   *   lastActiveAt}`. An attacker could trivially pick "the weakest +
   *   most recently active member of guild X" and target them for raids,
   *   alliance-war intelligence, or social-engineering.
   *
   *   Audit cycle 6 closed the API-side analog
   *   (`AllianceController.getMembers` →
   *   `AllianceService.assertMembership`) but the game-server's
   *   `GuildsController.members` was missed.
   *
   * Mitigation:
   *   - Extract the caller's userId from the JWT subject via
   *     `@CurrentUser()` and forward it to the service.
   *   - The service now requires the caller to be a member of the target
   *     guild (`guild_members WHERE guild_id = :id AND user_id = :caller`)
   *     and throws `ForbiddenException("Bu guild üyesi değilsin")`
   *     otherwise — matching the alliance.service.ts `assertMembership`
   *     pattern.
   *
   *   This is the harder of the two options on the table (public
   *   projection was the alternative). It was chosen because:
   *     a) it mirrors the alliance cycle 6 fix so the security surface is
   *        consistent across both team-grouping subsystems,
   *     b) the only FE caller of `getProfile` is `GuildDashboard`, which
   *        is rendered exclusively when the viewer is `inGuild &&
   *        activeGuildId === ownGuildId` — so the production FE never
   *        needs roster data for a foreign guild, and
   *     c) the public-facing "browse guilds" page already gets the
   *        member-count summary from `GET /guilds` (no per-row PII).
   *
   * Legacy `/guilds/users/:userId/membership` IDOR-safe alias (cycle 3)
   * is unaffected — it already 403s on URL-vs-JWT mismatch.
   */
  @Get(':id/members')
  @UseGuards(HttpJwtGuard)
  members(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.guilds.listMembers(userId, id);
  }

  /**
   * GET /guilds/:id/events — activity feed (joins, leaves, donations).
   *
   * HIGH IDOR-GUILDS-MEMBERS-ENUM-01 (audit cycle 8 fix):
   *   The same vulnerability class as `members` above. Each event row
   *   carries `{userId, type, payload}` where `payload` includes donation
   *   `amount` + `resource`. Anonymous-to-the-guild enumeration of this
   *   feed lets attackers infer:
   *     - Member-by-member contribution recency ("X hasn't donated in 9
   *       days, probably inactive, hit them"),
   *     - Per-resource economic profile of the target guild,
   *     - Promote/demote/kick lifecycle leaks.
   *
   *   The fix is identical to `members`: pass the JWT subject down to the
   *   service so it can membership-gate. Non-members get a 403, not a
   *   sanitised projection — there is no production caller that needs the
   *   foreign-guild event feed, and the cycle-6 alliance fix set this
   *   precedent.
   */
  @Get(':id/events')
  @UseGuards(HttpJwtGuard)
  events(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.guilds.listEvents(userId, id, limit ? parseInt(limit, 10) : undefined);
  }

  @Post(':id/join')
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.OK)
  join(
    @Param('id') id: string,
    @Body() _dto: JoinGuildDto,
    @CurrentUser() userId: string,
  ) {
    return this.guilds.joinGuild(id, userId);
  }

  @Post(':id/leave')
  @UseGuards(HttpJwtGuard)
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
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.OK)
  donate(
    @Param('id') id: string,
    @Body() dto: DonateDto,
    @CurrentUser() userId: string,
  ) {
    return this.guilds.recordDonation(id, userId, dto.amount, dto.resource);
  }

  // ─── Tutorial state machine ─────────────────────────────────────────────────
  //
  // The :userId path segment was REMOVED from /tutorial/* endpoints —
  // a player can only read or advance THEIR OWN tutorial state, which
  // comes from the JWT.

  @Get('tutorial')
  @UseGuards(HttpJwtGuard)
  getTutorial(@CurrentUser() userId: string) {
    return this.guilds.getTutorialState(userId);
  }

  @Post('tutorial/advance')
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.OK)
  advance(@Body() dto: AdvanceTutorialDto, @CurrentUser() userId: string) {
    return this.guilds.advanceTutorial(userId, dto.toStep);
  }

  @Post('tutorial/reward')
  @UseGuards(HttpJwtGuard)
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
  @UseGuards(HttpJwtGuard)
  myMembership(@CurrentUser() userId: string) {
    return this.guilds.getUserMembership(userId);
  }

  @Get('users/:userId/membership')
  @UseGuards(HttpJwtGuard)
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
  //
  // HIGH IDOR-GUILD-RAIDS-ENUM-01 (audit cycle 15):
  //   Previously these GET handlers had only `HttpJwtGuard` — any logged-in
  //   player could `curl /api/guilds/<rival>/raids/current` (or the
  //   `/raids/:raidId/...` subroutes after enumerating ids via `listRaids`)
  //   and harvest every guild's weekly boss progress, per-member
  //   `damageDealt` + `lastAttackAt` recon, and loot drop ledger. Same
  //   class as cycle 11 IDOR-GUILDS-MEMBERS-ENUM-01 (which closed
  //   `/:id/members` + `/:id/events` via `assertGuildMembership`) — but
  //   the raid endpoints were missed in that pass.
  //
  // Mitigation:
  //   Caller's userId is now taken from the JWT subject via `@CurrentUser()`
  //   and forwarded as the first arg to each service method. The service
  //   resolves the target guild (via `guildId` directly, or via
  //   `raid.guildId` for raidId-keyed routes) and asserts the caller has a
  //   `guild_members` row in it — mirroring the cycle 11 fix pattern. Non-
  //   members get a hard 403 ("Bu guild raid bilgilerine erişemezsin").

  @Get(':id/raids/current')
  @UseGuards(HttpJwtGuard)
  currentRaid(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.raids.getCurrentRaid(userId, id);
  }

  @Get(':id/raids')
  @UseGuards(HttpJwtGuard)
  listRaids(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.raids.listRaids(userId, id, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('raids/:raidId')
  @UseGuards(HttpJwtGuard)
  getRaid(@Param('raidId') raidId: string, @CurrentUser() userId: string) {
    return this.raids.getRaid(userId, raidId);
  }

  @Get('raids/:raidId/contributions')
  @UseGuards(HttpJwtGuard)
  raidContributions(@Param('raidId') raidId: string, @CurrentUser() userId: string) {
    return this.raids.listContributions(userId, raidId);
  }

  @Get('raids/:raidId/drops')
  @UseGuards(HttpJwtGuard)
  raidDrops(@Param('raidId') raidId: string, @CurrentUser() userId: string) {
    return this.raids.listDrops(userId, raidId);
  }

  /**
   * POST /guilds/raids/:raidId/attack — internal-service only.
   *
   * ## Security history (HIGH ECON-CYC6-02 — audit cycle 6 fix)
   *
   * Previously gated by `HttpJwtGuard`. The DTO had `@IsInt @Min(1)` on
   * `damage` but no upper bound, so any logged-in player could POST
   * `{damage: 999999999}` and one-shot any raid boss. Even the cycle 3
   * raid_damage_pct buff multiplier didn't help — the FE-supplied
   * `damage` was applied verbatim against `boss_current_hp`.
   *
   * Concrete impact:
   *   curl -X POST $GAME/guilds/raids/$RAID/attack \
   *     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
   *     -d '{"damage": 999999999}'
   *   → boss dies in one hit → caller credited with the full
   *   `damageDealt` → top-5 contributor bonus to the same caller →
   *   guild gets `RAID_TIER_SCORE_REWARD[tier]` tierScore → essence
   *   drops resolved → wallet fills up to the weekly cap.
   *
   * ## The fix
   *
   * Mirrors the cycle 3 B1 pattern used by
   * `/buildings/resources/battle-reward` and
   * `/progression/award-xp`:
   *
   *   1. Swap guard from `HttpJwtGuard` to `InternalServiceGuard`
   *      (header `X-Internal-Service: Bearer <secret>`).
   *      The endpoint is no longer reachable by player tokens.
   *   2. Take `userId` from the request body — the player's JWT is no
   *      longer the source of identity because internal-service callers
   *      don't carry one. The trusted backend asserts WHICH player is
   *      being credited.
   *   3. Cap `damage` at 1M in the DTO (`@Max(1_000_000)`) as
   *      defense-in-depth: a leaked internal secret still can't one-shot
   *      bosses in one POST.
   *
   * ## Who calls this now
   *
   * Today: nobody in production. A grep of `apps/web` confirmed no
   * frontend code path POSTs to this endpoint — only e2e tests under
   * `apps/web/e2e/guild.api.spec.ts` (which are being updated to send
   * the internal-service header).
   *
   * Tomorrow: a future battle-resolution path (PvE finishGame,
   * BossService.attackBoss for raid bosses, or a dedicated
   * `GuildRaidBattleService`) will call this server-side AFTER
   * computing `rawDamage` from the attacker's unit stats via the same
   * stamped-stats / unit-cap pipeline boss.service.ts already uses. The
   * caller will set the `X-Internal-Service` header and supply
   * `{userId, damage}` in the body.
   *
   * If a real "player taps a button on the FE → instant raid damage"
   * UX becomes a product requirement later, the right shape is a
   * NEW public endpoint that takes a battle-session id (not raw
   * damage) and recomputes damage server-side from the participating
   * units. Do not relax this guard back to HttpJwtGuard.
   */
  @Post('raids/:raidId/attack')
  @UseGuards(InternalServiceGuard)
  @HttpCode(HttpStatus.OK)
  attackRaid(
    @Param('raidId') raidId: string,
    @Body() dto: RaidAttackDto,
  ) {
    return this.raids.attack(raidId, dto.userId, dto.damage);
  }

  @Post('raids/:raidId/resolve-drops')
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.OK)
  resolveDrops(@Param('raidId') raidId: string, @CurrentUser() userId: string) {
    // Pass the caller so the service membership-gates this mutation
    // (cycle-31 IDOR-GUILD-RAIDS-RESOLVE-DROPS).
    return this.raids.resolveDrops(raidId, userId);
  }

  @Get('me/essence')
  @UseGuards(HttpJwtGuard)
  myEssenceBalance(@CurrentUser() userId: string) {
    return this.raids.getEssenceBalance(userId);
  }

  @Get('me/essence/weekly')
  @UseGuards(HttpJwtGuard)
  myEssenceWeekly(@CurrentUser() userId: string) {
    return this.raids.getWeeklyEssenceUsage(userId);
  }

  // Deprecated IDOR-safe aliases — see comment near `me/membership`.

  @Get('users/:userId/essence')
  @UseGuards(HttpJwtGuard)
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
  @UseGuards(HttpJwtGuard)
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
  //
  // HIGH IDOR-GUILD-RESEARCH-ENUM-02 (audit cycle 15):
  //   Previously these GET handlers had only `HttpJwtGuard` — any logged-in
  //   player could `curl /api/guilds/<rival>/research/buffs` (combat-intel
  //   leak: rival's stacked raid_damage_pct / member_capacity), or
  //   `/research/<stateId>/contributions` (per-member xpContributed roster
  //   — "weakest contributor" recon). Same vulnerability class as cycle 15
  //   A1 (IDOR-GUILD-RAIDS-ENUM-01) + cycle 11 IDOR-GUILDS-MEMBERS-ENUM-01
  //   (which closed `/:id/members` + `/:id/events` via
  //   `assertGuildMembership`) — but the research endpoints were missed.
  //
  // Mitigation:
  //   Caller's userId is now taken from the JWT subject via `@CurrentUser()`
  //   and forwarded as the first arg to each service method. The service
  //   resolves the target guild (via `guildId` directly, or via
  //   `state.guildId` for stateId-keyed routes) and asserts the caller has
  //   a `guild_members` row in it — mirroring the cycle 11 + cycle 15 A1
  //   pattern. Non-members get a hard 403 ("Bu guild araştırmalarına
  //   erişemezsin"). `research/catalog` stays open (static config — no
  //   per-guild PII).

  @Get('research/catalog')
  @UseGuards(HttpJwtGuard)
  researchCatalog() {
    return this.research.catalog();
  }

  @Get(':id/research')
  @UseGuards(HttpJwtGuard)
  guildResearch(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.research.listGuildResearch(userId, id);
  }

  @Get(':id/research/active')
  @UseGuards(HttpJwtGuard)
  guildResearchActive(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.research.getActiveSlots(userId, id);
  }

  @Get(':id/research/buffs')
  @UseGuards(HttpJwtGuard)
  guildBuffs(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.research.getGuildBuffs(userId, id);
  }

  @Post(':id/research/start')
  @UseGuards(HttpJwtGuard)
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
  @UseGuards(HttpJwtGuard)
  getResearch(@Param('stateId') stateId: string, @CurrentUser() userId: string) {
    return this.research.getResearchState(userId, stateId);
  }

  @Get('research/:stateId/contributions')
  @UseGuards(HttpJwtGuard)
  researchContributions(
    @Param('stateId') stateId: string,
    @CurrentUser() userId: string,
  ) {
    return this.research.listContributions(userId, stateId);
  }

  @Post('research/:stateId/contribute')
  @UseGuards(HttpJwtGuard)
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
