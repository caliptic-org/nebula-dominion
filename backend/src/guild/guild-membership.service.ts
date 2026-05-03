import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Guild } from './entities/guild.entity';
import { GuildMember, GuildRole } from './entities/guild-member.entity';
import { GuildEvent } from './entities/guild-event.entity';
import { GuildSuggestion, GuildSuggestionService, GUILD_MAX_MEMBERS } from './guild-suggestion.service';
import { AnalyticsService } from '../analytics/analytics.service';

export interface JoinResult {
  guildId: string;
  name: string;
  tag: string;
  role: GuildRole;
  memberCount: number;
  joinedAt: Date;
  suggestion?: GuildSuggestion;
}

@Injectable()
export class GuildMembershipService {
  private readonly logger = new Logger(GuildMembershipService.name);

  constructor(
    @InjectRepository(GuildMember)
    private readonly memberRepo: Repository<GuildMember>,
    @InjectRepository(Guild)
    private readonly guildRepo: Repository<Guild>,
    private readonly dataSource: DataSource,
    private readonly suggestion: GuildSuggestionService,
    private readonly analytics: AnalyticsService,
  ) {}

  async getMember(userId: string): Promise<GuildMember> {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) throw new NotFoundException('User is not in a guild');
    return member;
  }

  async findMember(userId: string): Promise<GuildMember | null> {
    return this.memberRepo.findOne({ where: { userId } });
  }

  async getMemberInGuild(guildId: string, userId: string): Promise<GuildMember> {
    const member = await this.memberRepo.findOne({ where: { userId, guildId } });
    if (!member) throw new NotFoundException('User is not in this guild');
    return member;
  }

  async listMembers(guildId: string): Promise<GuildMember[]> {
    return this.memberRepo.find({ where: { guildId } });
  }

  async assertOfficerOrLeader(guildId: string, userId: string): Promise<GuildMember> {
    const member = await this.getMemberInGuild(guildId, userId);
    if (member.role !== GuildRole.LEADER && member.role !== GuildRole.OFFICER) {
      throw new ForbiddenException('Officer or leader role required');
    }
    return member;
  }

  /**
   * One-click join: atomically inserts the user as a guild member, increments
   * member_count, and writes a guild_event. Refuses if the user is already in
   * any guild or the target is at capacity.
   */
  async joinGuild(userId: string, guildId: string): Promise<JoinResult> {
    return this.dataSource.transaction(async (em) => {
      const existing = await em.findOne(GuildMember, { where: { userId } });
      if (existing) {
        throw new ConflictException('User already belongs to a guild');
      }

      const guild = await em
        .createQueryBuilder(Guild, 'g')
        .setLock('pessimistic_write')
        .where('g.id = :id', { id: guildId })
        .getOne();
      if (!guild) throw new NotFoundException('Guild not found');
      if (guild.memberCount >= GUILD_MAX_MEMBERS) {
        throw new ConflictException('Guild is full');
      }

      const member = await em.save(
        em.create(GuildMember, {
          guildId: guild.id,
          userId,
          role: GuildRole.MEMBER,
        }),
      );

      guild.memberCount += 1;
      await em.save(guild);

      await em.save(
        em.create(GuildEvent, {
          guildId: guild.id,
          userId,
          eventType: 'join',
          payload: { source: 'auto_suggest' },
        }),
      );

      await this.analytics.trackServer({
        event_type: 'guild_join',
        user_id: userId,
        session_id: 'system',
        properties: {
          guild_id: guild.id,
          tag: guild.tag,
          member_count: guild.memberCount,
          source: 'auto_suggest',
        },
      });

      return {
        guildId: guild.id,
        name: guild.name,
        tag: guild.tag,
        role: member.role,
        memberCount: guild.memberCount,
        joinedAt: member.joinedAt,
      };
    });
  }

  /**
   * Lowest-friction path: pick the highest-ranked suggestion for the user and
   * join it in a single round-trip. Returns 404 if no candidate exists so the
   * client can fall back to a "create guild" flow.
   */
  async quickJoin(userId: string): Promise<JoinResult> {
    const existing = await this.findMember(userId);
    if (existing) {
      throw new ConflictException('User already belongs to a guild');
    }

    const best = await this.suggestion.pickBest(userId);
    if (!best) {
      throw new NotFoundException('No guild suggestions available');
    }

    const result = await this.joinGuild(userId, best.guildId);
    return { ...result, suggestion: best };
  }
}
