import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoopRaidRun, CoopRaidStatus } from './entities/coop-raid-run.entity';
import { CoopRaidParticipant } from './entities/coop-raid-participant.entity';
import { AnalyticsService } from '../analytics/analytics.service';
import { ContributionService } from '../guild/contribution.service';

// ─── Constants ────────────────────────────────────────────────────────────────

export const COOP_RAID_MAX_PARTICIPANTS = 5;
export const COOP_RAID_RUN_DURATION_MIN = 30;
export const COOP_RAID_BOSS_HP_BASE = 1_000_000;
export const COOP_RAID_GAS_DROP = 200;
export const COOP_RAID_RARE_MAT_DROP = 1;
export const COOP_RAID_MUTATION_ESSENCE_CHANCE = 0.15;

// Saturday=6, 12:00–22:00 local
const COOP_WINDOW_DAY = 6;
const COOP_WINDOW_START_HOUR = 12;
const COOP_WINDOW_END_HOUR = 22;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoWeekKey(d: Date = new Date()): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoopRaidWindowState {
  open: boolean;
  reason?: string;
}

export interface CoopRaidRunSummary {
  id: string;
  guildId: string;
  leaderId: string;
  status: CoopRaidStatus;
  bossHpTotal: number;
  bossHpRemaining: number;
  startedAt: string;
  expiresAt: string;
  completedAt: string | null;
  participantCount: number;
  weekKey: string;
}

export interface CoopRaidDealDamageResponse {
  runId: string;
  bossHpRemaining: number;
  totalDamageByPlayer: number;
  status: CoopRaidStatus;
  completed: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CoopRaidService {
  private readonly logger = new Logger(CoopRaidService.name);

  constructor(
    @InjectRepository(CoopRaidRun)
    private readonly runRepo: Repository<CoopRaidRun>,
    @InjectRepository(CoopRaidParticipant)
    private readonly partRepo: Repository<CoopRaidParticipant>,
    private readonly analytics: AnalyticsService,
    private readonly contribution: ContributionService,
  ) {}

  isWindowOpen(now: Date = new Date(), tzOffsetMinutes = 0): CoopRaidWindowState {
    const local = new Date(now.getTime() + tzOffsetMinutes * 60_000);
    const day = local.getUTCDay();
    const hour = local.getUTCHours();
    if (day !== COOP_WINDOW_DAY) {
      return { open: false, reason: 'Co-op raid is open Saturday only' };
    }
    if (hour < COOP_WINDOW_START_HOUR || hour >= COOP_WINDOW_END_HOUR) {
      return { open: false, reason: 'Co-op raid window is 12:00–22:00 local' };
    }
    return { open: true };
  }

  // ─── Run lifecycle ─────────────────────────────────────────────────────────

  async createRun(
    guildId: string,
    leaderId: string,
    opts: { tzOffsetMinutes?: number; allowOutsideWindow?: boolean } = {},
  ): Promise<CoopRaidRun> {
    const window = this.isWindowOpen(new Date(), opts.tzOffsetMinutes ?? 0);
    if (!window.open && !opts.allowOutsideWindow) {
      throw new BadRequestException(window.reason ?? 'Co-op raid window is closed');
    }

    // Disallow more than one in-progress/open run per guild
    const existing = await this.runRepo
      .createQueryBuilder('r')
      .where('r.guild_id = :gid', { gid: guildId })
      .andWhere('r.status IN (:...statuses)', { statuses: [CoopRaidStatus.OPEN, CoopRaidStatus.IN_PROGRESS] })
      .getOne();
    if (existing) {
      throw new ConflictException(`Guild already has an active co-op raid run (${existing.id})`);
    }

    const expires = new Date(Date.now() + COOP_RAID_RUN_DURATION_MIN * 60_000);
    const run = await this.runRepo.save(
      this.runRepo.create({
        guildId,
        leaderId,
        bossHpTotal: COOP_RAID_BOSS_HP_BASE,
        bossHpRemaining: COOP_RAID_BOSS_HP_BASE,
        status: CoopRaidStatus.OPEN,
        expiresAt: expires,
        weekKey: isoWeekKey(),
      }),
    );

    // Auto-add leader as first participant
    await this.partRepo.save(this.partRepo.create({ runId: run.id, userId: leaderId }));

    this.logger.log(`Co-op raid run created: ${run.id} guild=${guildId} leader=${leaderId}`);
    return run;
  }

  async joinRun(runId: string, userId: string): Promise<CoopRaidParticipant> {
    const run = await this.requireRun(runId);
    if (run.status !== CoopRaidStatus.OPEN && run.status !== CoopRaidStatus.IN_PROGRESS) {
      throw new BadRequestException(`Run status=${run.status}, cannot join`);
    }
    if (run.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Run has already expired');
    }

    const existing = await this.partRepo.findOne({ where: { runId, userId } });
    if (existing) return existing;

    const partCount = await this.partRepo.count({ where: { runId } });
    if (partCount >= COOP_RAID_MAX_PARTICIPANTS) {
      throw new ConflictException(`Run is full (${COOP_RAID_MAX_PARTICIPANTS}/${COOP_RAID_MAX_PARTICIPANTS})`);
    }

    const part = await this.partRepo.save(this.partRepo.create({ runId, userId }));
    if (run.status === CoopRaidStatus.OPEN && partCount + 1 >= 2) {
      // Switch to in_progress on second join (a coop raid technically can start solo too)
      run.status = CoopRaidStatus.IN_PROGRESS;
      await this.runRepo.save(run);
    }
    return part;
  }

  // ─── Damage + completion ───────────────────────────────────────────────────

  async dealDamage(
    runId: string,
    userId: string,
    damage: number,
  ): Promise<CoopRaidDealDamageResponse> {
    if (damage <= 0) throw new BadRequestException('damage must be positive');
    const run = await this.requireRun(runId);
    if (run.status === CoopRaidStatus.COMPLETED) {
      throw new BadRequestException('Run already completed');
    }
    if (run.status === CoopRaidStatus.EXPIRED || run.expiresAt.getTime() < Date.now()) {
      run.status = CoopRaidStatus.EXPIRED;
      await this.runRepo.save(run);
      throw new BadRequestException('Run has expired');
    }

    const participant = await this.partRepo.findOne({ where: { runId, userId } });
    if (!participant) {
      throw new NotFoundException(`User ${userId} is not a participant of run ${runId}`);
    }

    const dealt = Math.min(damage, run.bossHpRemaining);
    run.bossHpRemaining -= dealt;
    participant.damageDealt += dealt;

    if (run.status === CoopRaidStatus.OPEN) {
      run.status = CoopRaidStatus.IN_PROGRESS;
    }

    let completed = false;
    if (run.bossHpRemaining <= 0) {
      run.status = CoopRaidStatus.COMPLETED;
      run.completedAt = new Date();
      completed = true;
    }

    await Promise.all([this.runRepo.save(run), this.partRepo.save(participant)]);

    if (completed) {
      await this.finalizeRun(run);
    }

    return {
      runId,
      bossHpRemaining: Math.max(0, run.bossHpRemaining),
      totalDamageByPlayer: participant.damageDealt,
      status: run.status,
      completed,
    };
  }

  private async finalizeRun(run: CoopRaidRun): Promise<void> {
    const participants = await this.partRepo.find({ where: { runId: run.id } });
    const totalDamage = participants.reduce((s, p) => s + p.damageDealt, 0) || 1;

    for (const part of participants) {
      const damagePct = part.damageDealt / totalDamage;
      part.gasDrop = COOP_RAID_GAS_DROP;
      part.rareMatDrop = COOP_RAID_RARE_MAT_DROP;
      part.mutationEssenceDrop = Math.random() < COOP_RAID_MUTATION_ESSENCE_CHANCE ? 1 : 0;
      part.rewardsGranted = true;

      // Contribution: raid_damage_pct × 50 (compound; we record the % as 0–1)
      await this.contribution.addRaidDamagePct(run.guildId, part.userId, damagePct).catch((err) => {
        this.logger.error(`Failed to record raid contribution for ${part.userId}`, err);
      });
    }

    await this.partRepo.save(participants);

    // Telemetry: mid_game_events.coop_raid_run
    await this.analytics.trackServer({
      event_type: 'coop_raid_run',
      user_id: run.leaderId,
      session_id: run.id,
      properties: {
        run_id: run.id,
        guild_id: run.guildId,
        participant_count: participants.length,
        total_damage: totalDamage,
        boss_hp_total: run.bossHpTotal,
        duration_seconds: run.completedAt
          ? Math.round((run.completedAt.getTime() - run.startedAt.getTime()) / 1000)
          : null,
        week_key: run.weekKey,
        mutation_drops: participants.filter((p) => p.mutationEssenceDrop > 0).length,
      },
    });

    this.logger.log(
      `Co-op raid ${run.id} completed: guild=${run.guildId} participants=${participants.length} damage=${totalDamage}`,
    );
  }

  // ─── Read helpers ──────────────────────────────────────────────────────────

  async getRun(runId: string): Promise<CoopRaidRunSummary> {
    const run = await this.requireRun(runId);
    const partCount = await this.partRepo.count({ where: { runId } });
    return this.toSummary(run, partCount);
  }

  async getRunParticipants(runId: string): Promise<CoopRaidParticipant[]> {
    return this.partRepo.find({ where: { runId } });
  }

  async listGuildRuns(guildId: string, weekKey?: string): Promise<CoopRaidRunSummary[]> {
    const qb = this.runRepo
      .createQueryBuilder('r')
      .where('r.guild_id = :gid', { gid: guildId })
      .orderBy('r.started_at', 'DESC')
      .limit(50);
    if (weekKey) qb.andWhere('r.week_key = :wk', { wk: weekKey });
    const runs = await qb.getMany();
    return Promise.all(
      runs.map(async (r) => {
        const c = await this.partRepo.count({ where: { runId: r.id } });
        return this.toSummary(r, c);
      }),
    );
  }

  // ─── Operator job: expire stale runs ───────────────────────────────────────

  async expireStaleRuns(): Promise<{ expired: number }> {
    const now = new Date();
    const stale = await this.runRepo
      .createQueryBuilder('r')
      .where('r.status IN (:...statuses)', { statuses: [CoopRaidStatus.OPEN, CoopRaidStatus.IN_PROGRESS] })
      .andWhere('r.expires_at < :now', { now })
      .getMany();
    for (const r of stale) {
      r.status = CoopRaidStatus.EXPIRED;
    }
    if (stale.length > 0) {
      await this.runRepo.save(stale);
    }
    return { expired: stale.length };
  }

  private async requireRun(runId: string): Promise<CoopRaidRun> {
    const run = await this.runRepo.findOne({ where: { id: runId } });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    return run;
  }

  private toSummary(run: CoopRaidRun, participantCount: number): CoopRaidRunSummary {
    return {
      id: run.id,
      guildId: run.guildId,
      leaderId: run.leaderId,
      status: run.status,
      bossHpTotal: run.bossHpTotal,
      bossHpRemaining: run.bossHpRemaining,
      startedAt: run.startedAt.toISOString(),
      expiresAt: run.expiresAt.toISOString(),
      completedAt: run.completedAt ? run.completedAt.toISOString() : null,
      participantCount,
      weekKey: run.weekKey,
    };
  }
}
