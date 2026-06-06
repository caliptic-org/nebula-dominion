import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { DataSource, Repository, LessThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Guild } from './entities/guild.entity';
import { GuildMember, GuildRole } from './entities/guild-member.entity';
import { GuildEvent, GuildEventType } from './entities/guild-event.entity';
import {
  GuildResearchState,
  GuildResearchStatus,
} from './entities/guild-research-state.entity';
import { GuildResearchContribution } from './entities/guild-research-contribution.entity';
import { TELEMETRY_GUILD_ACTIVITY } from './guilds.constants';
import {
  RESEARCH_DURATION_DAYS,
  RESEARCH_WEEKLY_SLOTS,
  composeGuildBuffs,
  getResearchDefinition,
  getResearchLevelConfig,
  GUILD_RESEARCH_CATALOG,
  GuildBuffsSnapshot,
} from './research.config';
import { isoWeekStartUtc, MS_PER_DAY } from './time.util';

interface StartResearchInput {
  guildId: string;
  researchId: string;
  level: number;
  selectedBy: string;
}

interface ContributeInput {
  researchStateId: string;
  userId: string;
  xp: number;
}

@Injectable()
export class GuildResearchService {
  private readonly logger = new Logger(GuildResearchService.name);
  private readonly serverShard = process.env.SERVER_SHARD ?? 'shard-default';

  constructor(
    @InjectRepository(GuildResearchState)
    private readonly researchRepo: Repository<GuildResearchState>,
    @InjectRepository(GuildResearchContribution)
    private readonly contribRepo: Repository<GuildResearchContribution>,
    private readonly emitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Read API ─────────────────────────────────────────────────────────────

  catalog() {
    return GUILD_RESEARCH_CATALOG;
  }

  async listGuildResearch(guildId: string): Promise<GuildResearchState[]> {
    return this.researchRepo.find({
      where: { guildId },
      order: { startedAt: 'DESC' },
    });
  }

  async getActiveSlots(guildId: string, now: Date = new Date()): Promise<GuildResearchState[]> {
    const weekStart = isoWeekStartUtc(now);
    return this.researchRepo.find({
      where: {
        guildId,
        slotWeekStart: weekStart,
        status: GuildResearchStatus.RESEARCHING,
      },
      order: { startedAt: 'ASC' },
    });
  }

  async getResearchState(stateId: string): Promise<GuildResearchState> {
    const state = await this.researchRepo.findOne({ where: { id: stateId } });
    if (!state) throw new NotFoundException(`Research state ${stateId} not found`);
    return state;
  }

  async listContributions(stateId: string): Promise<GuildResearchContribution[]> {
    return this.contribRepo.find({
      where: { researchStateId: stateId },
      order: { xpContributed: 'DESC' },
    });
  }

  async getGuildBuffs(guildId: string): Promise<GuildBuffsSnapshot> {
    const completed = await this.researchRepo.find({
      where: { guildId, status: GuildResearchStatus.COMPLETED },
      select: ['researchId', 'level'],
    });
    return composeGuildBuffs(
      completed.map((c) => ({ researchId: c.researchId, level: c.level })),
    );
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * Start a research instance. Only the leader or an officer may select.
   * Validates: catalog presence, prerequisite levels, weekly slot availability,
   * no duplicate active research at the same level.
   */
  async startResearch(input: StartResearchInput): Promise<GuildResearchState> {
    const def = getResearchDefinition(input.researchId);
    if (!def) {
      throw new BadRequestException(`Unknown research id: ${input.researchId}`);
    }
    const levelCfg = getResearchLevelConfig(input.researchId, input.level);
    if (!levelCfg) {
      throw new BadRequestException(
        `Research ${input.researchId} has no level ${input.level}`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const guild = await manager.findOne(Guild, { where: { id: input.guildId } });
      if (!guild) throw new NotFoundException(`Guild ${input.guildId} not found`);

      const selector = await manager.findOne(GuildMember, {
        where: { guildId: input.guildId, userId: input.selectedBy },
      });
      if (!selector) {
        throw new ForbiddenException('Selector is not a member of this guild');
      }
      if (selector.role !== GuildRole.LEADER && selector.role !== GuildRole.OFFICER) {
        throw new ForbiddenException('Only leader or officer may start research');
      }

      // Prereq: previous level must be completed
      if (input.level > 1) {
        const prev = await manager.findOne(GuildResearchState, {
          where: {
            guildId: input.guildId,
            researchId: input.researchId,
            level: input.level - 1,
            status: GuildResearchStatus.COMPLETED,
          },
        });
        if (!prev) {
          throw new BadRequestException(
            `Level ${input.level - 1} of ${input.researchId} must be completed first`,
          );
        }
      }

      // Already active? (any level for this researchId)
      const conflict = await manager.findOne(GuildResearchState, {
        where: {
          guildId: input.guildId,
          researchId: input.researchId,
          status: GuildResearchStatus.RESEARCHING,
        },
      });
      if (conflict) {
        throw new ConflictException(
          `Research ${input.researchId} is already active`,
        );
      }

      // Already completed at this level?
      const alreadyDone = await manager.findOne(GuildResearchState, {
        where: {
          guildId: input.guildId,
          researchId: input.researchId,
          level: input.level,
          status: GuildResearchStatus.COMPLETED,
        },
      });
      if (alreadyDone) {
        throw new ConflictException(
          `${input.researchId}@${input.level} already completed`,
        );
      }

      // Weekly slot capacity check
      const weekStart = isoWeekStartUtc(new Date());
      const used = await manager.count(GuildResearchState, {
        where: {
          guildId: input.guildId,
          slotWeekStart: weekStart,
          status: GuildResearchStatus.RESEARCHING,
        },
      });
      if (used >= RESEARCH_WEEKLY_SLOTS) {
        throw new ConflictException(
          `Weekly research slot cap reached (${RESEARCH_WEEKLY_SLOTS}/${RESEARCH_WEEKLY_SLOTS})`,
        );
      }

      const startedAt = new Date();
      const deadlineAt = new Date(startedAt.getTime() + RESEARCH_DURATION_DAYS * MS_PER_DAY);

      const state = manager.create(GuildResearchState, {
        guildId: input.guildId,
        researchId: input.researchId,
        branch: def.branch,
        level: input.level,
        status: GuildResearchStatus.RESEARCHING,
        xpRequired: levelCfg.xpRequired,
        xpContributed: 0,
        slotWeekStart: weekStart,
        startedAt,
        deadlineAt,
        selectedBy: input.selectedBy,
      });
      await manager.save(state);

      this.emitTelemetry({
        userId: input.selectedBy,
        guildId: input.guildId,
        kind: 'research_started',
        payload: {
          researchId: input.researchId,
          level: input.level,
          xpRequired: levelCfg.xpRequired,
          deadlineAt: deadlineAt.toISOString(),
        },
      });

      this.logger.log(
        `Research started: guild=${input.guildId} ${input.researchId}@${input.level} by ${input.selectedBy}`,
      );
      return state;
    });
  }

  /**
   * Contribute XP to an active research. Auto-completes when xpContributed
   * reaches xpRequired. Member must belong to the guild.
   *
   * ── ECONOMY GUARD (C6-04) ────────────────────────────────────────────────
   * Before this commit, contribute() read `input.xp` straight from the
   * client, clamped it to `xpRequired - xpContributed`, and advanced the
   * research + bumped `member.contribution_pts` accordingly — never
   * touching any wallet. A single POST `{xp: 9_999_999}` instantly
   * completed a research track (and minted contribution_pts for the
   * exploiter). There is no `guild_xp_pool` table in this codebase
   * (grepped — none); `player_resources.science` is the canonical
   * research currency that already accumulates from battles + garrisoned
   * relay/colony/mine nodes (see entities/resource.entity.ts L46).
   *
   * Fix mirrors AllianceService.deposit (apps/api/src/modules/alliance/
   * alliance.service.ts L202-260):
   *   1. Take a pessimistic row lock on the contributor's
   *      `player_resources` row (`FOR UPDATE`).
   *   2. Verify `science >= accepted` (the post-clamp value).
   *   3. UPDATE-deduct the science.
   *   4. Only then increment `state.xpContributed`, bump
   *      `member.contributionPts`, and save the contribution log row.
   * Order matters: if any step throws, the whole transaction rolls back
   * and the player's science is untouched.
   */
  async contribute(input: ContributeInput): Promise<{
    state: GuildResearchState;
    contribution: GuildResearchContribution;
    completed: boolean;
  }> {
    if (input.xp <= 0) throw new BadRequestException('xp must be > 0');
    // Defence-in-depth: DTO already enforces @Max(100_000), but the
    // service may be invoked from non-HTTP paths (cron, internal RPC)
    // that bypass class-validator. Clamp here too.
    if (input.xp > 100_000) {
      throw new BadRequestException('xp must be <= 100000 per call');
    }

    return this.dataSource.transaction(async (manager) => {
      const state = await manager.findOne(GuildResearchState, {
        where: { id: input.researchStateId },
      });
      if (!state) throw new NotFoundException(`Research state ${input.researchStateId} not found`);
      if (state.status !== GuildResearchStatus.RESEARCHING) {
        throw new BadRequestException(`Research is ${state.status}, not researching`);
      }

      const member = await manager.findOne(GuildMember, {
        where: { guildId: state.guildId, userId: input.userId },
      });
      if (!member) {
        throw new ForbiddenException('Contributor is not a member of this guild');
      }

      // Cap contribution at remaining xp so we never overshoot.
      const remaining = state.xpRequired - state.xpContributed;
      const accepted = Math.min(input.xp, remaining);

      // ── ECONOMY GUARD: lock + verify + debit science wallet ──────────
      // player_resources lives in the same Postgres DB. Raw SQL with
      // FOR UPDATE keeps the deduct atomic against the resource-tick
      // worker (which UPDATEs the same row every 30s).
      const balRows = (await manager.query(
        `SELECT science FROM player_resources
           WHERE player_id = $1::uuid FOR UPDATE`,
        [input.userId],
      )) as Array<{ science: number | string }>;
      const bal = balRows[0];
      if (!bal) {
        throw new BadRequestException('Oyuncu cüzdanı bulunamadı');
      }
      const science = Number(bal.science);
      if (science < accepted) {
        throw new BadRequestException(
          `Yetersiz bilim (need: ${accepted}, have: ${science})`,
        );
      }
      await manager.query(
        `UPDATE player_resources
            SET science = science - $2
          WHERE player_id = $1::uuid`,
        [input.userId, accepted],
      );

      state.xpContributed += accepted;
      const completed = state.xpContributed >= state.xpRequired;
      if (completed) {
        state.status = GuildResearchStatus.COMPLETED;
        state.completedAt = new Date();
      }
      await manager.save(state);

      let contrib = await manager.findOne(GuildResearchContribution, {
        where: { researchStateId: state.id, userId: input.userId },
      });
      if (!contrib) {
        contrib = manager.create(GuildResearchContribution, {
          researchStateId: state.id,
          userId: input.userId,
          xpContributed: 0,
        });
      }
      contrib.xpContributed += accepted;
      contrib.lastContribAt = new Date();
      await manager.save(contrib);

      // Bump member contribution_pts as well — research counts toward the
      // guild's overall contribution log.
      member.contributionPts += accepted;
      member.lastActiveAt = new Date();
      await manager.save(member);

      await manager.save(
        manager.create(GuildEvent, {
          guildId: state.guildId,
          userId: input.userId,
          type: GuildEventType.RESEARCH_CONTRIB,
          payload: {
            researchStateId: state.id,
            researchId: state.researchId,
            level: state.level,
            xp: accepted,
            completed,
          },
        }),
      );

      this.emitTelemetry({
        userId: input.userId,
        guildId: state.guildId,
        kind: 'research_contrib',
        payload: {
          researchStateId: state.id,
          xp: accepted,
          xpContributed: state.xpContributed,
          xpRequired: state.xpRequired,
        },
      });

      if (completed) {
        this.emitTelemetry({
          userId: input.userId,
          guildId: state.guildId,
          kind: 'research_complete',
          payload: {
            researchId: state.researchId,
            level: state.level,
            branch: state.branch,
          },
        });
        this.logger.log(
          `Research completed: guild=${state.guildId} ${state.researchId}@${state.level}`,
        );
      }

      return { state, contribution: contrib, completed };
    });
  }

  /**
   * Daily sweep at 00:05 UTC: mark overdue researches as cancelled if the
   * 7-day deadline has passed without completion. Their slot is freed up
   * implicitly because slot capacity counts only RESEARCHING rows.
   */
  @Cron('5 0 * * *', { timeZone: 'UTC', name: 'guild_research_deadline_sweep' })
  async cancelOverdueResearch(now: Date = new Date()): Promise<number> {
    const overdue = await this.researchRepo.find({
      where: {
        status: GuildResearchStatus.RESEARCHING,
        deadlineAt: LessThanOrEqual(now),
      },
    });
    for (const r of overdue) {
      r.status = GuildResearchStatus.CANCELLED;
      await this.researchRepo.save(r);
      this.emitTelemetry({
        userId: r.selectedBy,
        guildId: r.guildId,
        kind: 'research_cancelled',
        payload: {
          researchId: r.researchId,
          level: r.level,
          xpContributed: r.xpContributed,
          xpRequired: r.xpRequired,
          reason: 'deadline_expired',
        },
      });
    }
    if (overdue.length) this.logger.log(`Cancelled ${overdue.length} overdue research(es).`);
    return overdue.length;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private emitTelemetry(args: {
    userId: string;
    guildId: string | null;
    kind: string;
    payload?: Record<string, unknown>;
  }): void {
    this.emitter.emit(TELEMETRY_GUILD_ACTIVITY, {
      user_id: args.userId,
      guild_id: args.guildId,
      age: null,
      tier_badge: null,
      timestamp: new Date().toISOString(),
      server_shard: this.serverShard,
      payload: { kind: args.kind, ...(args.payload ?? {}) },
    });
  }
}
