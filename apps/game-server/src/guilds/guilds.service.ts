import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Guild } from './entities/guild.entity';
import { GuildMember, GuildRole } from './entities/guild-member.entity';
import { GuildEvent, GuildEventType } from './entities/guild-event.entity';
import {
  GuildTutorialState,
  TUTORIAL_STEP_ORDER,
  TutorialStep,
} from './entities/guild-tutorial-state.entity';
import { CreateGuildDto } from './dto/create-guild.dto';
import { ResourcesService } from '../resources/resources.service';
import { DONATABLE_RESOURCES, type DonatableResource } from './dto/membership.dto';
import {
  EVENT_GUILD_TUTORIAL_REQUIRED,
  TELEMETRY_GUILD_LIFECYCLE,
  TELEMETRY_GUILD_PROGRESSION,
  TUTORIAL_REWARD_COSMETIC,
  TUTORIAL_REWARD_ENERGY,
} from './guilds.constants';

interface TutorialRequiredEvent {
  userId: string;
  totalXp: number;
  age: number;
}

interface TelemetryEnvelope {
  user_id: string;
  guild_id: string | null;
  age: number | null;
  tier_badge: number | null;
  timestamp: string;
  server_shard: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name);
  private readonly serverShard = process.env.SERVER_SHARD ?? 'shard-default';

  constructor(
    @InjectRepository(Guild)
    private readonly guildRepo: Repository<Guild>,
    @InjectRepository(GuildMember)
    private readonly memberRepo: Repository<GuildMember>,
    @InjectRepository(GuildEvent)
    private readonly eventRepo: Repository<GuildEvent>,
    @InjectRepository(GuildTutorialState)
    private readonly tutorialRepo: Repository<GuildTutorialState>,
    private readonly resources: ResourcesService,
    private readonly emitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Guild lifecycle ────────────────────────────────────────────────────────

  /**
   * Create a new guild owned by `leaderId`.
   *
   * SECURITY CONTRACT (BLOCKER IDOR-GUILDS-CREATE-LEADER, audit cycle 6):
   *   `leaderId` MUST come from the JWT subject claim — never from the
   *   request body. The previous signature was
   *   `createGuild(dto)` where `dto.leaderId` was a body-supplied string,
   *   which let any authenticated player forge a guild with an arbitrary
   *   victim as the leader (see CreateGuildDto + guilds.controller.ts
   *   `create()` for the full attack writeup). Callers that need to seed
   *   guilds in tests/fixtures must explicitly pass the leader id as the
   *   second argument; there is no longer a body field to fall back on.
   */
  async createGuild(dto: CreateGuildDto, leaderId: string): Promise<Guild> {
    if (!leaderId) {
      throw new BadRequestException('leaderId is required');
    }

    const existingMembership = await this.memberRepo.findOne({
      where: { userId: leaderId },
    });
    if (existingMembership) {
      throw new ConflictException(`User ${leaderId} is already in a guild`);
    }

    const tag = dto.tag.toUpperCase();
    const tagTaken = await this.guildRepo.findOne({ where: { tag } });
    if (tagTaken) {
      throw new ConflictException(`Guild tag '${tag}' is already taken`);
    }
    const nameTaken = await this.guildRepo.findOne({ where: { name: dto.name } });
    if (nameTaken) {
      throw new ConflictException(`Guild name '${dto.name}' is already taken`);
    }

    return this.dataSource.transaction(async (manager) => {
      const guild = manager.create(Guild, {
        name: dto.name,
        tag,
        leaderId,
        memberCount: 1,
        tierScore: 0,
      });
      await manager.save(guild);

      await manager.save(
        manager.create(GuildMember, {
          guildId: guild.id,
          userId: leaderId,
          role: GuildRole.LEADER,
          contributionPts: 0,
        }),
      );

      await manager.save(
        manager.create(GuildEvent, {
          guildId: guild.id,
          userId: leaderId,
          type: GuildEventType.JOIN,
          payload: { role: GuildRole.LEADER, lifecycle: 'created' },
        }),
      );

      this.emitTelemetry(TELEMETRY_GUILD_LIFECYCLE, {
        userId: leaderId,
        guildId: guild.id,
        kind: 'created',
        age: null,
        tierBadge: null,
      });

      this.logger.log(`Guild created: ${guild.name} [${guild.tag}] leader=${leaderId}`);
      return guild;
    });
  }

  async listGuilds(limit = 50, offset = 0): Promise<Guild[]> {
    return this.guildRepo.find({
      order: { tierScore: 'DESC', createdAt: 'DESC' },
      take: Math.min(limit, 100),
      skip: offset,
    });
  }

  async getGuild(id: string): Promise<Guild> {
    const guild = await this.guildRepo.findOne({ where: { id } });
    if (!guild) throw new NotFoundException(`Guild ${id} not found`);
    return guild;
  }

  async findByTag(tag: string): Promise<Guild> {
    const guild = await this.guildRepo.findOne({ where: { tag: tag.toUpperCase() } });
    if (!guild) throw new NotFoundException(`Guild with tag ${tag} not found`);
    return guild;
  }

  // ─── Membership ─────────────────────────────────────────────────────────────

  async joinGuild(guildId: string, userId: string): Promise<GuildMember> {
    const guild = await this.getGuild(guildId);

    const existing = await this.memberRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException(`User ${userId} is already in a guild`);
    }

    return this.dataSource.transaction(async (manager) => {
      const member = manager.create(GuildMember, {
        guildId: guild.id,
        userId,
        role: GuildRole.MEMBER,
      });
      await manager.save(member);

      await manager.increment(Guild, { id: guild.id }, 'memberCount', 1);

      await manager.save(
        manager.create(GuildEvent, {
          guildId: guild.id,
          userId,
          type: GuildEventType.JOIN,
          payload: { role: GuildRole.MEMBER },
        }),
      );

      this.emitTelemetry(TELEMETRY_GUILD_LIFECYCLE, {
        userId,
        guildId: guild.id,
        kind: 'joined',
        age: null,
        tierBadge: null,
      });

      // If joining is the player's first guild action while tutorial is required,
      // advance to guild_chosen.
      const tutorial = await manager.findOne(GuildTutorialState, { where: { userId } });
      if (tutorial && tutorial.tutorialRequired && tutorial.state === TutorialStep.NOT_STARTED) {
        tutorial.state = TutorialStep.GUILD_CHOSEN;
        await manager.save(tutorial);
        this.emitTelemetry(TELEMETRY_GUILD_PROGRESSION, {
          userId,
          guildId: guild.id,
          kind: 'tutorial_step_complete',
          payload: { step: TutorialStep.GUILD_CHOSEN },
        });
      }

      this.logger.log(`User ${userId} joined guild ${guild.tag}`);
      return member;
    });
  }

  async leaveGuild(guildId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { guildId, userId } });
    if (!member) throw new NotFoundException(`User ${userId} is not in guild ${guildId}`);

    if (member.role === GuildRole.LEADER) {
      throw new ForbiddenException(
        'Leader cannot leave the guild — transfer leadership or disband instead',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.remove(member);
      await manager.decrement(Guild, { id: guildId }, 'memberCount', 1);
      await manager.save(
        manager.create(GuildEvent, {
          guildId,
          userId,
          type: GuildEventType.LEAVE,
          payload: { reason: 'voluntary' },
        }),
      );

      this.emitTelemetry(TELEMETRY_GUILD_LIFECYCLE, {
        userId,
        guildId,
        kind: 'left',
        age: null,
        tierBadge: null,
      });
    });

    this.logger.log(`User ${userId} left guild ${guildId}`);
  }

  async listMembers(guildId: string): Promise<GuildMember[]> {
    await this.getGuild(guildId);
    return this.memberRepo.find({
      where: { guildId },
      order: { role: 'ASC', contributionPts: 'DESC' },
    });
  }

  async getUserMembership(userId: string): Promise<GuildMember | null> {
    return this.memberRepo.findOne({ where: { userId } });
  }

  // ─── Activity / events ──────────────────────────────────────────────────────

  async listEvents(guildId: string, limit = 50): Promise<GuildEvent[]> {
    await this.getGuild(guildId);
    return this.eventRepo.find({
      where: { guildId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 200),
    });
  }

  /**
   * Records a guild donation: debits the caller's player_resources wallet
   * by `amount` of the named `resource`, then credits the same amount as
   * contribution points to the caller's GuildMember row.
   *
   * ── ECONOMY GUARD (audit ECON-CYC6-03, HIGH) ──────────────────────────
   * Before this commit, recordDonation() bumped `member.contributionPts`
   * by `amount` and wrote a DONATE GuildEvent — but NEVER touched
   * `player_resources`. A player could POST
   *     { amount: 1_000_000, resource: 'mineral' }
   * to /guilds/<id>/donate and farm contribution_pts (and the FIRST_DONATION
   * tutorial step + its reward) for free, with no mineral debit at all.
   *
   * This implementation mirrors the alliance.service.ts `deposit()` fix
   * (apps/api/src/modules/alliance/alliance.service.ts:223-260):
   *
   *   1. Lock the player_resources row FOR UPDATE inside the same tx so a
   *      concurrent trickle-tick / buildings.controller deduct can't race
   *      and let the wallet go negative.
   *   2. Verify `balance[resource] >= amount` — reject with
   *      BadRequestException("Yetersiz <resource>") otherwise.
   *   3. UPDATE player_resources SET <col> = <col> - amount.
   *   4. ONLY THEN bump contributionPts + write the GuildEvent row.
   *
   * `resource` is constrained to {mineral, gas, energy} by the
   * DonateDto @IsIn validator. We also re-validate here as a server-side
   * belt-and-braces against future callers (e.g. internal services)
   * skipping the DTO pipe.
   *
   * Defence-in-depth: DonateDto enforces @Max(10_000_000) on `amount`.
   */
  async recordDonation(
    guildId: string,
    userId: string,
    amount: number,
    resource: DonatableResource = 'mineral',
  ): Promise<GuildEvent> {
    const member = await this.memberRepo.findOne({ where: { guildId, userId } });
    if (!member) throw new ForbiddenException(`User ${userId} is not a member of guild ${guildId}`);

    if (!DONATABLE_RESOURCES.includes(resource)) {
      throw new BadRequestException(`Geçersiz kaynak: ${resource}`);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Bağış miktarı pozitif olmalı');
    }

    return this.dataSource.transaction(async (manager) => {
      // ── 1. Lock the player_resources row + verify balance ──────────────
      // Use a parameterised raw SELECT...FOR UPDATE on the underlying
      // table (same approach the alliance deposit fix uses) so we don't
      // depend on the entity's column-name camelCase mapping at runtime,
      // and we only fetch the column the caller is debiting.
      const balRows = (await manager.query(
        `SELECT mineral, gas, energy FROM player_resources
           WHERE player_id = $1::uuid FOR UPDATE`,
        [userId],
      )) as Array<{ mineral: string | number; gas: string | number; energy: string | number }>;
      const bal = balRows[0];
      if (!bal) {
        throw new BadRequestException('Oyuncu cüzdanı bulunamadı');
      }

      const have = Number(bal[resource]);
      if (have < amount) {
        throw new BadRequestException(
          `Yetersiz ${resource}: cüzdanda ${have}, talep edilen ${amount}`,
        );
      }

      // ── 2. Debit the wallet inside the same transaction ────────────────
      // Column name is whitelisted via DONATABLE_RESOURCES so it's safe to
      // interpolate into the SQL (no user-controlled identifier reaches
      // this line — `resource` was validated against the constant tuple
      // above). The amount itself is parameterised.
      await manager.query(
        `UPDATE player_resources
            SET ${resource} = ${resource} - $2
          WHERE player_id = $1::uuid`,
        [userId, amount],
      );

      // Invalidate the Redis snapshot cache so the next /resources read
      // doesn't serve a stale wallet.
      await this.resources.invalidateCache(userId);

      // ── 3. Credit contribution points + write the GuildEvent ───────────
      member.contributionPts += amount;
      member.lastActiveAt = new Date();
      await manager.save(member);

      const event = await manager.save(
        manager.create(GuildEvent, {
          guildId,
          userId,
          type: GuildEventType.DONATE,
          payload: { amount, resource },
        }),
      );

      // Tutorial: NOT_STARTED → GUILD_CHOSEN happens on join,
      // GUILD_CHOSEN → FIRST_DONATION happens on first donation.
      const tutorial = await manager.findOne(GuildTutorialState, { where: { userId } });
      if (
        tutorial &&
        tutorial.tutorialRequired &&
        tutorial.state === TutorialStep.GUILD_CHOSEN
      ) {
        tutorial.state = TutorialStep.FIRST_DONATION;
        await manager.save(tutorial);
        this.emitTelemetry(TELEMETRY_GUILD_PROGRESSION, {
          userId,
          guildId,
          kind: 'first_donation',
          payload: { amount, step: TutorialStep.FIRST_DONATION },
        });
      }

      return event;
    });
  }

  // ─── Tutorial state machine ─────────────────────────────────────────────────

  @OnEvent(EVENT_GUILD_TUTORIAL_REQUIRED)
  async onTutorialRequired(payload: TutorialRequiredEvent): Promise<void> {
    await this.markTutorialRequired(payload.userId);
    this.logger.log(
      `Tutorial required: user=${payload.userId} totalXp=${payload.totalXp} age=${payload.age}`,
    );
  }

  async getTutorialState(userId: string): Promise<GuildTutorialState> {
    let state = await this.tutorialRepo.findOne({ where: { userId } });
    if (!state) {
      state = this.tutorialRepo.create({
        userId,
        tutorialRequired: false,
        state: TutorialStep.NOT_STARTED,
        rewardGranted: false,
      });
      await this.tutorialRepo.save(state);
    }
    return state;
  }

  async markTutorialRequired(userId: string): Promise<GuildTutorialState> {
    const state = await this.getTutorialState(userId);
    if (!state.tutorialRequired) {
      state.tutorialRequired = true;
      await this.tutorialRepo.save(state);
    }
    return state;
  }

  async advanceTutorial(userId: string, toStep: TutorialStep): Promise<GuildTutorialState> {
    const state = await this.getTutorialState(userId);
    if (!state.tutorialRequired) {
      throw new BadRequestException('Tutorial is not required for this user yet');
    }

    const currentIdx = TUTORIAL_STEP_ORDER.indexOf(state.state);
    const targetIdx = TUTORIAL_STEP_ORDER.indexOf(toStep);
    if (targetIdx <= currentIdx) {
      throw new BadRequestException(
        `Cannot move backward or stay at same step (${state.state} → ${toStep})`,
      );
    }
    if (targetIdx !== currentIdx + 1) {
      throw new BadRequestException(
        `Tutorial steps must advance one at a time (${state.state} → ${toStep})`,
      );
    }

    state.state = toStep;
    if (toStep === TutorialStep.COMPLETED) {
      state.completedAt = new Date();
    }
    await this.tutorialRepo.save(state);

    this.emitTelemetry(TELEMETRY_GUILD_PROGRESSION, {
      userId,
      guildId: null,
      kind: 'tutorial_step_complete',
      payload: { step: toStep },
    });

    return state;
  }

  async grantTutorialReward(userId: string): Promise<{
    state: GuildTutorialState;
    reward: { energy: number; cosmetic: string };
  }> {
    const state = await this.getTutorialState(userId);
    if (state.state !== TutorialStep.COMPLETED) {
      throw new BadRequestException('Tutorial must be completed before claiming reward');
    }
    if (state.rewardGranted) {
      throw new ConflictException('Tutorial reward has already been granted');
    }

    await this.resources.grant(userId, { energy: TUTORIAL_REWARD_ENERGY });

    state.rewardGranted = true;
    await this.tutorialRepo.save(state);

    this.emitTelemetry(TELEMETRY_GUILD_PROGRESSION, {
      userId,
      guildId: null,
      kind: 'tutorial_reward_granted',
      payload: { energy: TUTORIAL_REWARD_ENERGY, cosmetic: TUTORIAL_REWARD_COSMETIC },
    });

    this.logger.log(`Tutorial reward granted: user=${userId}`);
    return {
      state,
      reward: { energy: TUTORIAL_REWARD_ENERGY, cosmetic: TUTORIAL_REWARD_COSMETIC },
    };
  }

  // ─── Telemetry helpers ──────────────────────────────────────────────────────

  private emitTelemetry(
    channel: typeof TELEMETRY_GUILD_LIFECYCLE | typeof TELEMETRY_GUILD_PROGRESSION,
    args: {
      userId: string;
      guildId: string | null;
      kind: string;
      age?: number | null;
      tierBadge?: number | null;
      payload?: Record<string, unknown>;
    },
  ): void {
    const envelope: TelemetryEnvelope = {
      user_id: args.userId,
      guild_id: args.guildId,
      age: args.age ?? null,
      tier_badge: args.tierBadge ?? null,
      timestamp: new Date().toISOString(),
      server_shard: this.serverShard,
      payload: { kind: args.kind, ...(args.payload ?? {}) },
    };
    this.emitter.emit(channel, envelope);
  }
}
