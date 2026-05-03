import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuildMute } from './entities/guild-mute.entity';
import { GuildReport, ReportStatus } from './entities/guild-report.entity';
import { GuildEvent } from './entities/guild-event.entity';
import { GuildMembershipService } from './guild-membership.service';

@Injectable()
export class GuildModerationService {
  private readonly logger = new Logger(GuildModerationService.name);

  constructor(
    @InjectRepository(GuildMute)
    private readonly muteRepo: Repository<GuildMute>,
    @InjectRepository(GuildReport)
    private readonly reportRepo: Repository<GuildReport>,
    @InjectRepository(GuildEvent)
    private readonly eventRepo: Repository<GuildEvent>,
    private readonly membership: GuildMembershipService,
  ) {}

  async muteMember(
    moderatorId: string,
    targetUserId: string,
    durationSeconds: number,
    reason?: string,
  ): Promise<GuildMute> {
    const moderator = await this.membership.getMember(moderatorId);
    await this.membership.assertOfficerOrLeader(moderator.guildId, moderatorId);

    const target = await this.membership.getMemberInGuild(moderator.guildId, targetUserId);
    if (target.userId === moderatorId) {
      throw new ConflictException('Cannot mute yourself');
    }

    const expiresAt = new Date(Date.now() + durationSeconds * 1000);
    const mute = await this.muteRepo.save(
      this.muteRepo.create({
        guildId: moderator.guildId,
        userId: targetUserId,
        mutedBy: moderatorId,
        reason: reason ?? null,
        expiresAt,
      }),
    );

    await this.eventRepo.save(
      this.eventRepo.create({
        guildId: moderator.guildId,
        userId: moderatorId,
        eventType: 'mute',
        payload: { targetUserId, durationSeconds, reason },
      }),
    );

    return mute;
  }

  async unmute(moderatorId: string, targetUserId: string): Promise<void> {
    const moderator = await this.membership.getMember(moderatorId);
    await this.membership.assertOfficerOrLeader(moderator.guildId, moderatorId);

    await this.muteRepo
      .createQueryBuilder()
      .update()
      .set({ expiresAt: () => 'NOW()' })
      .where('guild_id = :guildId AND user_id = :userId AND expires_at > NOW()', {
        guildId: moderator.guildId,
        userId: targetUserId,
      })
      .execute();
  }

  async listActiveMutes(guildId: string): Promise<GuildMute[]> {
    return this.muteRepo
      .createQueryBuilder('m')
      .where('m.guild_id = :guildId AND m.expires_at > NOW()', { guildId })
      .orderBy('m.expires_at', 'DESC')
      .getMany();
  }

  async report(
    reporterId: string,
    targetUserId: string,
    reason: string,
    messageId?: string,
  ): Promise<GuildReport> {
    const reporter = await this.membership.getMember(reporterId);
    if (reporterId === targetUserId) {
      throw new ConflictException('Cannot report yourself');
    }

    const report = await this.reportRepo.save(
      this.reportRepo.create({
        guildId: reporter.guildId,
        reporterId,
        targetUserId,
        messageId: messageId ?? null,
        reason,
        status: ReportStatus.OPEN,
      }),
    );

    await this.eventRepo.save(
      this.eventRepo.create({
        guildId: reporter.guildId,
        userId: reporterId,
        eventType: 'report',
        payload: { targetUserId, messageId, reason },
      }),
    );

    return report;
  }

  async listReports(moderatorId: string, status?: ReportStatus): Promise<GuildReport[]> {
    const moderator = await this.membership.getMember(moderatorId);
    await this.membership.assertOfficerOrLeader(moderator.guildId, moderatorId);

    const where: Record<string, unknown> = { guildId: moderator.guildId };
    if (status) where.status = status;
    return this.reportRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
  }

  async resolveReport(moderatorId: string, reportId: string, status: ReportStatus): Promise<void> {
    const moderator = await this.membership.getMember(moderatorId);
    await this.membership.assertOfficerOrLeader(moderator.guildId, moderatorId);

    const report = await this.reportRepo.findOne({ where: { id: reportId, guildId: moderator.guildId } });
    if (!report) throw new NotFoundException('Report not found');
    report.status = status;
    await this.reportRepo.save(report);
  }
}
