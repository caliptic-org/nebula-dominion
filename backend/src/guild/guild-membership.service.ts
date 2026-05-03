import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuildMember, GuildRole } from './entities/guild-member.entity';

@Injectable()
export class GuildMembershipService {
  constructor(
    @InjectRepository(GuildMember)
    private readonly memberRepo: Repository<GuildMember>,
  ) {}

  async getMember(userId: string): Promise<GuildMember> {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) throw new NotFoundException('User is not in a guild');
    return member;
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
}
