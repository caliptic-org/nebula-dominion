import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import { GuildInactiveMarker, InactiveAction } from './entities/guild-inactive-marker.entity';
import { Guild } from '../guild/entities/guild.entity';
import { GuildMember } from '../guild/entities/guild-member.entity';

// ─── Thresholds ──────────────────────────────────────────────────────────────

export const INACTIVE_KICK_ELIGIBLE_DAYS = 14;
export const INACTIVE_AUTO_KICK_DAYS = 21;
export const INACTIVE_GUILD_ARCHIVE_DAYS = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InactiveGuardScanResult {
  kickEligibleMarked: number;
  autoKicked: number;
  guildsArchived: number;
}

export interface KickEligibleEntry {
  userId: string;
  guildId: string;
  lastActiveAt: string | null;
  daysInactive: number;
  markedAt: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class InactiveGuardService {
  private readonly logger = new Logger(InactiveGuardService.name);

  constructor(
    @InjectRepository(GuildInactiveMarker)
    private readonly markerRepo: Repository<GuildInactiveMarker>,
    @InjectRepository(Guild)
    private readonly guildRepo: Repository<Guild>,
    @InjectRepository(GuildMember)
    private readonly memberRepo: Repository<GuildMember>,
  ) {}

  // ─── Scan job: mark, auto-kick, archive ────────────────────────────────────

  async scan(now: Date = new Date()): Promise<InactiveGuardScanResult> {
    const result: InactiveGuardScanResult = {
      kickEligibleMarked: 0,
      autoKicked: 0,
      guildsArchived: 0,
    };

    const dayMs = 86400_000;
    const eligibleCutoff = new Date(now.getTime() - INACTIVE_KICK_ELIGIBLE_DAYS * dayMs);
    const kickCutoff = new Date(now.getTime() - INACTIVE_AUTO_KICK_DAYS * dayMs);
    const archiveCutoff = new Date(now.getTime() - INACTIVE_GUILD_ARCHIVE_DAYS * dayMs);

    // 1) Mark members as kick_eligible after 14 days inactivity (unique per user
    //    until they become active again — we re-create the marker only if the
    //    most recent open marker was resolved or never existed)
    const eligibleMembers = await this.memberRepo.find({
      where: { lastActiveAt: LessThan(eligibleCutoff) },
      take: 5000,
    });

    for (const member of eligibleMembers) {
      // Skip those already past auto-kick threshold (handled below)
      if (member.lastActiveAt < kickCutoff) continue;

      const existing = await this.markerRepo.findOne({
        where: {
          userId: member.userId,
          guildId: member.guildId,
          action: InactiveAction.KICK_ELIGIBLE,
          resolvedAt: IsNull(),
        },
      });
      if (existing) continue;

      const days = Math.floor((now.getTime() - member.lastActiveAt.getTime()) / dayMs);
      await this.markerRepo.save(
        this.markerRepo.create({
          userId: member.userId,
          guildId: member.guildId,
          action: InactiveAction.KICK_ELIGIBLE,
          daysInactive: days,
          lastActiveAt: member.lastActiveAt,
        }),
      );
      result.kickEligibleMarked += 1;
    }

    // 2) Auto-kick members past 21 days
    const kickMembers = await this.memberRepo.find({
      where: { lastActiveAt: LessThan(kickCutoff) },
      take: 5000,
    });

    for (const member of kickMembers) {
      const days = Math.floor((now.getTime() - member.lastActiveAt.getTime()) / dayMs);
      await this.memberRepo.delete({ id: member.id });

      // Decrement guild member_count
      await this.guildRepo
        .createQueryBuilder()
        .update()
        .set({ memberCount: () => 'GREATEST(0, member_count - 1)' })
        .where('id = :id', { id: member.guildId })
        .execute();

      // Resolve any open kick_eligible markers for this user
      await this.markerRepo.update(
        {
          userId: member.userId,
          guildId: member.guildId,
          action: InactiveAction.KICK_ELIGIBLE,
          resolvedAt: IsNull(),
        },
        { resolvedAt: now },
      );

      // Persist the auto_kicked marker
      await this.markerRepo.save(
        this.markerRepo.create({
          userId: member.userId,
          guildId: member.guildId,
          action: InactiveAction.AUTO_KICKED,
          daysInactive: days,
          lastActiveAt: member.lastActiveAt,
        }),
      );
      result.autoKicked += 1;
    }

    // 3) Archive guilds with no member activity for 30 days. We compute a guild's
    //    "last activity" as MAX(lastActiveAt) across remaining members.
    //    A guild with zero remaining members is also archived.
    const guilds = await this.guildRepo
      .createQueryBuilder('g')
      .where('g.archived_at IS NULL')
      .getMany();

    for (const guild of guilds) {
      const latestMember = await this.memberRepo
        .createQueryBuilder('m')
        .select('MAX(m.last_active_at)', 'latest')
        .addSelect('COUNT(m.id)', 'cnt')
        .where('m.guild_id = :gid', { gid: guild.id })
        .getRawOne<{ latest: string | null; cnt: string }>();

      const memberCount = latestMember ? parseInt(latestMember.cnt, 10) : 0;
      const latest = latestMember?.latest ? new Date(latestMember.latest) : null;
      const guildLastActive = latest ?? guild.createdAt;

      const shouldArchive = memberCount === 0
        ? guildLastActive < archiveCutoff
        : guildLastActive < archiveCutoff;

      if (shouldArchive) {
        // Tag with archived_at and rename tag to free-form (suffix to avoid unique conflicts)
        const archivedAt = now;
        await this.guildRepo
          .createQueryBuilder()
          .update()
          .set({
            // Use a raw expression to avoid TS column typing limits on this.guildRepo
          })
          .where('id = :id', { id: guild.id })
          .execute();

        await this.guildRepo.query(
          `UPDATE guilds
             SET archived_at = $1,
                 tag = LEFT(CONCAT('A', SUBSTRING(id::text, 1, 4)), 5)
           WHERE id = $2`,
          [archivedAt, guild.id],
        );

        await this.markerRepo.save(
          this.markerRepo.create({
            guildId: guild.id,
            userId: null,
            action: InactiveAction.GUILD_ARCHIVED,
            daysInactive: Math.floor((now.getTime() - guildLastActive.getTime()) / dayMs),
            lastActiveAt: guildLastActive,
          }),
        );
        result.guildsArchived += 1;
      }
    }

    this.logger.log(
      `InactiveGuard scan: marked=${result.kickEligibleMarked} kicked=${result.autoKicked} archived=${result.guildsArchived}`,
    );
    return result;
  }

  // ─── Read helpers ──────────────────────────────────────────────────────────

  async listKickEligible(guildId: string): Promise<KickEligibleEntry[]> {
    const markers = await this.markerRepo.find({
      where: { guildId, action: InactiveAction.KICK_ELIGIBLE, resolvedAt: IsNull() },
      order: { daysInactive: 'DESC' },
      take: 200,
    });
    return markers
      .filter((m) => m.userId)
      .map((m) => ({
        userId: m.userId as string,
        guildId: m.guildId,
        lastActiveAt: m.lastActiveAt ? m.lastActiveAt.toISOString() : null,
        daysInactive: m.daysInactive,
        markedAt: m.createdAt.toISOString(),
      }));
  }

  /**
   * Manual one-click kick by leader/officer for a kick-eligible member.
   * Removes the member, decrements count, resolves marker.
   */
  async manualKick(guildId: string, userId: string): Promise<{ kicked: boolean }> {
    const member = await this.memberRepo.findOne({ where: { guildId, userId } });
    if (!member) return { kicked: false };

    await this.memberRepo.delete({ id: member.id });
    await this.guildRepo
      .createQueryBuilder()
      .update()
      .set({ memberCount: () => 'GREATEST(0, member_count - 1)' })
      .where('id = :id', { id: guildId })
      .execute();

    await this.markerRepo.update(
      {
        userId,
        guildId,
        action: InactiveAction.KICK_ELIGIBLE,
        resolvedAt: IsNull(),
      },
      { resolvedAt: new Date() },
    );
    return { kicked: true };
  }

  async getGuildArchiveHistory(guildId: string): Promise<GuildInactiveMarker[]> {
    return this.markerRepo.find({
      where: { guildId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
