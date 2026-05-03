import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { DataSource, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Guild } from './entities/guild.entity';
import { GuildMember } from './entities/guild-member.entity';
import { GuildEvent, GuildEventType } from './entities/guild-event.entity';
import { GuildResearchState, GuildResearchStatus } from './entities/guild-research-state.entity';
import { GuildRaid, GuildRaidStatus, GuildRaidTier } from './entities/guild-raid.entity';
import { GuildRaidContribution } from './entities/guild-raid-contribution.entity';
import {
  GuildRaidDrop,
  GuildRaidDropSource,
} from './entities/guild-raid-drop.entity';
import { MutationEssenceBalance } from './entities/mutation-essence-balance.entity';
import { MutationEssenceWeeklyGrant } from './entities/mutation-essence-weekly-grant.entity';
import { TELEMETRY_GUILD_ACTIVITY } from './guilds.constants';
import {
  ESSENCE_WEEKLY_CAP_PER_PLAYER,
  RAID_BASE_DROP_TABLE,
  RAID_BASE_HP,
  RAID_DROP_RESOLVE_CRON,
  RAID_EXPIRE_CRON,
  RAID_MIN_MEMBER_FLOOR,
  RAID_SCHEDULE_CRON,
  RAID_TIER_HP_MULTIPLIER,
  RAID_TIER_SCORE_REWARD,
  RAID_TOP_CONTRIBUTOR_BONUS,
  RAID_TOP_CONTRIBUTOR_COUNT,
} from './raid.config';
import { composeGuildBuffs } from './research.config';
import { isoWeekEndUtc, isoWeekStartUtc } from './time.util';

interface AttackResult {
  raidId: string;
  guildId: string;
  bossCurrentHp: number;
  bossMaxHp: number;
  damageDealt: number;
  totalUserDamage: number;
  killedThisAttack: boolean;
  status: GuildRaidStatus;
}

interface DropAward {
  userId: string;
  baseAmount: number;
  bonusAmount: number;
  cappedExcess: number;
  totalGranted: number;
}

@Injectable()
export class GuildRaidsService {
  private readonly logger = new Logger(GuildRaidsService.name);
  private readonly serverShard = process.env.SERVER_SHARD ?? 'shard-default';
  private readonly rng: () => number;

  constructor(
    @InjectRepository(Guild)
    private readonly guildRepo: Repository<Guild>,
    @InjectRepository(GuildRaid)
    private readonly raidRepo: Repository<GuildRaid>,
    @InjectRepository(GuildRaidContribution)
    private readonly contribRepo: Repository<GuildRaidContribution>,
    @InjectRepository(GuildRaidDrop)
    private readonly dropRepo: Repository<GuildRaidDrop>,
    @InjectRepository(MutationEssenceBalance)
    private readonly essenceRepo: Repository<MutationEssenceBalance>,
    @InjectRepository(MutationEssenceWeeklyGrant)
    private readonly weeklyGrantRepo: Repository<MutationEssenceWeeklyGrant>,
    private readonly emitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {
    this.rng = () => Math.random();
  }

  // ─── Scheduling ──────────────────────────────────────────────────────────

  /**
   * Boss HP scale: `base × tier_multiplier × √(max(member_count, MIN_FLOOR))`.
   * Floored at MIN_FLOOR=3 so very small guilds still face the minimum baseline.
   */
  computeBossHp(memberCount: number, tier: GuildRaidTier): number {
    const m = Math.max(memberCount, RAID_MIN_MEMBER_FLOOR);
    const base = RAID_BASE_HP * RAID_TIER_HP_MULTIPLIER[tier];
    return Math.round(base * Math.sqrt(m));
  }

  /** Weekly cron: spawn one raid per active guild for the upcoming ISO week. */
  @Cron(RAID_SCHEDULE_CRON, { timeZone: 'UTC', name: 'guild_raid_weekly_spawn' })
  async spawnWeeklyRaids(now: Date = new Date()): Promise<number> {
    const weekStart = isoWeekStartUtc(now);
    const weekEnd = isoWeekEndUtc(weekStart);
    this.logger.log(`Spawning weekly raids for ISO week ${weekStart.toISOString()}`);

    const guilds = await this.guildRepo.find({});
    let spawned = 0;
    for (const guild of guilds) {
      const exists = await this.raidRepo.findOne({
        where: { guildId: guild.id, weekStart },
      });
      if (exists) continue;

      const tier = this.pickDefaultTier(guild.tierScore);
      const hp = this.computeBossHp(guild.memberCount, tier);
      await this.raidRepo.save(
        this.raidRepo.create({
          guildId: guild.id,
          weekStart,
          weekEnd,
          tier,
          bossMaxHp: hp,
          bossCurrentHp: hp,
          memberCountSnapshot: Math.max(guild.memberCount, RAID_MIN_MEMBER_FLOOR),
          status: GuildRaidStatus.ACTIVE,
        }),
      );
      spawned++;

      this.emitTelemetry({
        userId: guild.leaderId,
        guildId: guild.id,
        kind: 'raid_scheduled',
        payload: { tier, bossMaxHp: hp, weekStart: weekStart.toISOString() },
      });
    }
    this.logger.log(`Spawned ${spawned} new raid(s).`);
    return spawned;
  }

  /** Sunday 23:59 UTC sweep: any still-active raid is marked expired. */
  @Cron(RAID_EXPIRE_CRON, { timeZone: 'UTC', name: 'guild_raid_weekly_expire' })
  async expireOverdueRaids(now: Date = new Date()): Promise<number> {
    const overdue = await this.raidRepo.find({
      where: {
        status: GuildRaidStatus.ACTIVE,
        weekEnd: LessThanOrEqual(now),
      },
    });

    for (const raid of overdue) {
      raid.status = GuildRaidStatus.EXPIRED;
      await this.raidRepo.save(raid);
      this.emitTelemetry({
        userId: 'system',
        guildId: raid.guildId,
        kind: 'raid_expired',
        payload: { raidId: raid.id, hpRemaining: raid.bossCurrentHp },
      });
    }
    if (overdue.length) this.logger.log(`Expired ${overdue.length} raid(s).`);
    return overdue.length;
  }

  /** Periodic sweep: resolve drops for raids that have been completed but not yet awarded. */
  @Cron(RAID_DROP_RESOLVE_CRON, { name: 'guild_raid_drop_resolve_sweep' })
  async resolveCompletedRaidDrops(): Promise<number> {
    const pending = await this.raidRepo.find({
      where: {
        status: GuildRaidStatus.COMPLETED,
        dropsResolvedAt: IsNull(),
      },
    });
    for (const raid of pending) {
      try {
        await this.resolveDrops(raid.id);
      } catch (err) {
        this.logger.error(
          `Failed to resolve drops for raid ${raid.id}: ${(err as Error).message}`,
        );
      }
    }
    return pending.length;
  }

  private pickDefaultTier(tierScore: number): GuildRaidTier {
    // Default tier scaling by guild rank score: higher-tier guilds face elite bosses.
    if (tierScore >= 5_000) return GuildRaidTier.ELITE;
    if (tierScore >= 1_000) return GuildRaidTier.HARD;
    return GuildRaidTier.NORMAL;
  }

  // ─── Read APIs ────────────────────────────────────────────────────────────

  async getCurrentRaid(guildId: string): Promise<GuildRaid | null> {
    return this.raidRepo.findOne({
      where: { guildId, status: GuildRaidStatus.ACTIVE },
      order: { weekStart: 'DESC' },
    });
  }

  async getRaid(raidId: string): Promise<GuildRaid> {
    const raid = await this.raidRepo.findOne({ where: { id: raidId } });
    if (!raid) throw new NotFoundException(`Raid ${raidId} not found`);
    return raid;
  }

  async listRaids(guildId: string, limit = 12): Promise<GuildRaid[]> {
    return this.raidRepo.find({
      where: { guildId },
      order: { weekStart: 'DESC' },
      take: Math.min(limit, 52),
    });
  }

  async listContributions(raidId: string): Promise<GuildRaidContribution[]> {
    return this.contribRepo.find({
      where: { raidId },
      order: { damageDealt: 'DESC' },
    });
  }

  async listDrops(raidId: string): Promise<GuildRaidDrop[]> {
    return this.dropRepo.find({
      where: { raidId },
      order: { awardedAt: 'ASC' },
    });
  }

  async getEssenceBalance(userId: string): Promise<{ balance: number }> {
    const row = await this.essenceRepo.findOne({ where: { userId } });
    return { balance: row?.balance ?? 0 };
  }

  async getWeeklyEssenceUsage(
    userId: string,
    now: Date = new Date(),
  ): Promise<{ weekStart: string; granted: number; remaining: number }> {
    const weekStart = isoWeekStartUtc(now);
    const row = await this.weeklyGrantRepo.findOne({
      where: { userId, isoWeekStart: weekStart },
    });
    const granted = row?.grantedCount ?? 0;
    return {
      weekStart: weekStart.toISOString(),
      granted,
      remaining: Math.max(0, ESSENCE_WEEKLY_CAP_PER_PLAYER - granted),
    };
  }

  // ─── Attack flow ──────────────────────────────────────────────────────────

  /**
   * Apply player damage to the boss. Auto-completes the raid + emits drops
   * synchronously when HP hits zero. Damage values come from the battle/PvE
   * pipeline; this service does not roll RNG damage itself.
   *
   * The `rawDamage` argument is multiplied by the guild's raid_damage_pct
   * buff before being applied (research-driven, see `applyResearchBuffs`).
   */
  async attack(
    raidId: string,
    userId: string,
    rawDamage: number,
  ): Promise<AttackResult> {
    if (rawDamage <= 0) throw new BadRequestException('damage must be > 0');

    return this.dataSource.transaction(async (manager) => {
      const raid = await manager.findOne(GuildRaid, { where: { id: raidId } });
      if (!raid) throw new NotFoundException(`Raid ${raidId} not found`);
      if (raid.status !== GuildRaidStatus.ACTIVE) {
        throw new BadRequestException(`Raid is ${raid.status}, not active`);
      }

      const member = await manager.findOne(GuildMember, {
        where: { guildId: raid.guildId, userId },
      });
      if (!member) {
        throw new ForbiddenException(`User ${userId} is not a member of guild ${raid.guildId}`);
      }

      // Apply raid_damage buff
      const buffs = await this.computeGuildBuffsTx(manager, raid.guildId);
      const damageDealt = Math.max(
        1,
        Math.floor(rawDamage * (1 + buffs.raidDamagePct / 100)),
      );
      const remaining = Math.max(0, Number(raid.bossCurrentHp) - damageDealt);
      const actualDamage = Number(raid.bossCurrentHp) - remaining;
      const killed = remaining === 0;

      raid.bossCurrentHp = remaining;
      if (killed) {
        raid.status = GuildRaidStatus.COMPLETED;
        raid.completedAt = new Date();
      }
      await manager.save(raid);

      // Upsert contribution row.
      let contrib = await manager.findOne(GuildRaidContribution, {
        where: { raidId, userId },
      });
      if (!contrib) {
        contrib = manager.create(GuildRaidContribution, {
          raidId,
          userId,
          damageDealt: 0,
          joinedAt: new Date(),
        });
      }
      contrib.damageDealt = Number(contrib.damageDealt) + actualDamage;
      contrib.lastAttackAt = new Date();
      await manager.save(contrib);

      await manager.save(
        manager.create(GuildEvent, {
          guildId: raid.guildId,
          userId,
          type: GuildEventType.RAID_ATTEND,
          payload: {
            raidId,
            damage: actualDamage,
            killed,
            kind: 'raid_attack',
          },
        }),
      );

      this.emitTelemetry({
        userId,
        guildId: raid.guildId,
        kind: 'raid_join',
        payload: { raidId, damage: actualDamage, totalUserDamage: contrib.damageDealt },
      });

      if (killed) {
        this.emitTelemetry({
          userId,
          guildId: raid.guildId,
          kind: 'raid_finish',
          payload: { raidId, tier: raid.tier },
        });
        await manager.increment(
          Guild,
          { id: raid.guildId },
          'tierScore',
          RAID_TIER_SCORE_REWARD[raid.tier],
        );
      }

      return {
        raidId,
        guildId: raid.guildId,
        bossCurrentHp: remaining,
        bossMaxHp: Number(raid.bossMaxHp),
        damageDealt: actualDamage,
        totalUserDamage: contrib.damageDealt,
        killedThisAttack: killed,
        status: raid.status,
      };
    });
  }

  // ─── Drop resolution ──────────────────────────────────────────────────────

  /**
   * Resolves drops for a *completed* raid. Idempotent — checks
   * `dropsResolvedAt`. Honors the per-player 4-essence/week cap; excess is
   * recorded as `capped_excess` rows with amount=0 for audit.
   */
  async resolveDrops(raidId: string): Promise<DropAward[]> {
    return this.dataSource.transaction(async (manager) => {
      const raid = await manager.findOne(GuildRaid, { where: { id: raidId } });
      if (!raid) throw new NotFoundException(`Raid ${raidId} not found`);
      if (raid.status !== GuildRaidStatus.COMPLETED) {
        throw new BadRequestException('Drops only resolve for completed raids');
      }
      if (raid.dropsResolvedAt) {
        // Already resolved — return the stored awards
        const existing = await manager.find(GuildRaidDrop, { where: { raidId } });
        return this.summarizeDrops(existing);
      }

      const contributions = await manager.find(GuildRaidContribution, {
        where: { raidId },
        order: { damageDealt: 'DESC' },
      });
      if (contributions.length === 0) {
        raid.dropsResolvedAt = new Date();
        await manager.save(raid);
        return [];
      }

      const baseRange = RAID_BASE_DROP_TABLE[raid.tier];
      const top5Ids = new Set(
        contributions
          .slice(0, RAID_TOP_CONTRIBUTOR_COUNT)
          .map((c) => c.userId),
      );

      const awards = new Map<string, DropAward>();

      for (const c of contributions) {
        const baseAmount = this.rollInRange(baseRange.min, baseRange.max);
        const bonus = top5Ids.has(c.userId) ? RAID_TOP_CONTRIBUTOR_BONUS : 0;
        const desired = baseAmount + bonus;

        const granted = await this.grantEssenceWithCap(manager, c.userId, desired);
        const cappedExcess = desired - granted;

        // Persist drop rows for audit (one per source-bucket).
        if (baseAmount > 0) {
          const baseGranted = Math.min(baseAmount, granted);
          await manager.save(
            manager.create(GuildRaidDrop, {
              raidId,
              userId: c.userId,
              essenceAmount: baseGranted,
              source: GuildRaidDropSource.BASE,
            }),
          );
        }
        if (bonus > 0) {
          const bonusGranted = Math.min(bonus, Math.max(0, granted - baseAmount));
          await manager.save(
            manager.create(GuildRaidDrop, {
              raidId,
              userId: c.userId,
              essenceAmount: bonusGranted,
              source: GuildRaidDropSource.TOP5_BONUS,
            }),
          );
        }
        if (cappedExcess > 0) {
          await manager.save(
            manager.create(GuildRaidDrop, {
              raidId,
              userId: c.userId,
              essenceAmount: cappedExcess, // recorded as the capped delta for audit
              source: GuildRaidDropSource.CAPPED_EXCESS,
            }),
          );
        }

        awards.set(c.userId, {
          userId: c.userId,
          baseAmount,
          bonusAmount: bonus,
          cappedExcess,
          totalGranted: granted,
        });

        this.emitTelemetry({
          userId: c.userId,
          guildId: raid.guildId,
          kind: 'raid_drop_awarded',
          payload: {
            raidId,
            tier: raid.tier,
            base: baseAmount,
            bonus,
            granted,
            cappedExcess,
          },
        });
      }

      raid.dropsResolvedAt = new Date();
      await manager.save(raid);

      return [...awards.values()];
    });
  }

  // ─── Essence grant / cap ──────────────────────────────────────────────────

  private async grantEssenceWithCap(
    manager: import('typeorm').EntityManager,
    userId: string,
    desired: number,
    now: Date = new Date(),
  ): Promise<number> {
    if (desired <= 0) return 0;
    const weekStart = isoWeekStartUtc(now);

    let weekly = await manager.findOne(MutationEssenceWeeklyGrant, {
      where: { userId, isoWeekStart: weekStart },
    });
    if (!weekly) {
      weekly = manager.create(MutationEssenceWeeklyGrant, {
        userId,
        isoWeekStart: weekStart,
        grantedCount: 0,
      });
    }

    const remaining = Math.max(0, ESSENCE_WEEKLY_CAP_PER_PLAYER - weekly.grantedCount);
    const granted = Math.min(desired, remaining);
    if (granted === 0) return 0;

    weekly.grantedCount += granted;
    await manager.save(weekly);

    let balance = await manager.findOne(MutationEssenceBalance, { where: { userId } });
    if (!balance) {
      balance = manager.create(MutationEssenceBalance, { userId, balance: 0 });
    }
    balance.balance += granted;
    await manager.save(balance);

    return granted;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private rollInRange(min: number, max: number): number {
    if (max <= min) return min;
    const span = max - min + 1;
    return min + Math.floor(this.rng() * span);
  }

  private summarizeDrops(rows: GuildRaidDrop[]): DropAward[] {
    const acc = new Map<string, DropAward>();
    for (const r of rows) {
      const a = acc.get(r.userId) ?? {
        userId: r.userId,
        baseAmount: 0,
        bonusAmount: 0,
        cappedExcess: 0,
        totalGranted: 0,
      };
      switch (r.source) {
        case GuildRaidDropSource.BASE:
          a.baseAmount += r.essenceAmount;
          a.totalGranted += r.essenceAmount;
          break;
        case GuildRaidDropSource.TOP5_BONUS:
          a.bonusAmount += r.essenceAmount;
          a.totalGranted += r.essenceAmount;
          break;
        case GuildRaidDropSource.CAPPED_EXCESS:
          a.cappedExcess += r.essenceAmount;
          break;
      }
      acc.set(r.userId, a);
    }
    return [...acc.values()];
  }

  private async computeGuildBuffsTx(
    manager: import('typeorm').EntityManager,
    guildId: string,
  ): Promise<{ productionPct: number; raidDamagePct: number; memberCapacity: number }> {
    const completed = await manager.find(GuildResearchState, {
      where: { guildId, status: GuildResearchStatus.COMPLETED },
      select: ['researchId', 'level'],
    });
    const snapshot = composeGuildBuffs(
      completed.map((c) => ({ researchId: c.researchId, level: c.level })),
    );
    return {
      productionPct: snapshot.productionPct,
      raidDamagePct: snapshot.raidDamagePct,
      memberCapacity: snapshot.memberCapacity,
    };
  }

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
