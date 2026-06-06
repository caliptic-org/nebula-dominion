import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage, ChannelType } from './entities/chat-message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { GuildMember } from '../guilds/entities/guild-member.entity';

const HISTORY_LIMIT = 50;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(GuildMember)
    private readonly guildMemberRepo: Repository<GuildMember>,
  ) {}

  /**
   * Check whether the given user is a member of the given guild/alliance.
   * Used by ChatGateway to authorize join/get_history on ALLIANCE rooms,
   * preventing arbitrary clients from snooping on other guilds' chat.
   */
  async isGuildMember(userId: string, guildId: string): Promise<boolean> {
    if (!userId || !guildId) return false;
    const member = await this.guildMemberRepo.findOne({
      where: { guildId, userId },
      select: ['guildId', 'userId'],
    });
    return !!member;
  }

  /**
   * Verify that `callerUserId` is one of the two participants encoded
   * in a PRIVATE channelId. PRIVATE channelIds are deterministic
   * `[userA, userB].sort().join(":")`, so any authenticated client could
   * previously emit `get_history` with another pair's channelId and
   * receive the last N DMs. This guard prevents that IDOR.
   */
  isPrivateChannelParticipant(callerUserId: string, channelId: string): boolean {
    if (!callerUserId || !channelId) return false;
    const parts = channelId.split(':');
    if (parts.length !== 2) return false;
    return parts[0] === callerUserId || parts[1] === callerUserId;
  }

  /**
   * Persist a chat message after applying channel-level authorization.
   *
   * SECURITY (CYC7-CHAT-SEND-ALLIANCE-NO-MEMBERSHIP + IDOR-CHAT-WS-ALLIANCE-SEND-02,
   * defense-in-depth, 2026-06-06):
   * ChatGateway.handleSendMessage is the primary auth gate, but we duplicate
   * the ALLIANCE membership check here so that:
   *   1. any future caller (REST controller, internal cron, system-event
   *      pipeline, future gateway) that forwards user-supplied channelId
   *      cannot silently bypass the cycle 7 authorization;
   *   2. a regression in the gateway (e.g. someone removes the guard)
   *      cannot reopen the spam/spoof vector without a parallel removal
   *      here being noticed in review.
   *
   * `senderId` is treated as authoritative (must come from a verified JWT).
   * For ALLIANCE channels we re-check guild membership before insert. For
   * PRIVATE channels we re-verify the senderId is one of the two encoded
   * participants in channelId.
   */
  async sendMessage(senderId: string, dto: SendMessageDto): Promise<ChatMessage> {
    if (!senderId) {
      throw new BadRequestException('Gönderici ID gereklidir');
    }
    if (dto.channelType === ChannelType.PRIVATE && !dto.channelId) {
      throw new BadRequestException('Özel mesaj için alıcı ID gereklidir');
    }
    if (dto.channelType === ChannelType.ALLIANCE && !dto.channelId) {
      throw new BadRequestException('İttifak kanalı için ittifak ID gereklidir');
    }

    if (dto.channelType === ChannelType.ALLIANCE) {
      const isMember = await this.isGuildMember(senderId, dto.channelId as string);
      if (!isMember) {
        throw new BadRequestException('İttifak kanalına yazma izniniz yok');
      }
    }

    if (dto.channelType === ChannelType.PRIVATE) {
      if (!this.isPrivateChannelParticipant(senderId, dto.channelId as string)) {
        throw new BadRequestException('Özel mesaj kanalına yazma izniniz yok');
      }
    }

    const message = this.messageRepo.create({
      senderId,
      channelType: dto.channelType,
      channelId: dto.channelId ?? null,
      content: dto.content,
    });

    return this.messageRepo.save(message);
  }

  async getHistory(channelType: ChannelType, channelId?: string): Promise<ChatMessage[]> {
    const qb = this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.channelType = :channelType', { channelType })
      .andWhere('msg.isDeleted = false')
      .orderBy('msg.createdAt', 'DESC')
      .take(HISTORY_LIMIT);

    if (channelId) {
      qb.andWhere('msg.channelId = :channelId', { channelId });
    }

    const messages = await qb.getMany();
    return messages.reverse();
  }

  async getPrivateHistory(userId1: string, userId2: string): Promise<ChatMessage[]> {
    const channelId = [userId1, userId2].sort().join(':');
    return this.getHistory(ChannelType.PRIVATE, channelId);
  }

  async deleteMessage(messageId: string, requesterId: string): Promise<void> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message) return;
    if (message.senderId !== requesterId) {
      throw new BadRequestException('Sadece kendi mesajınızı silebilirsiniz');
    }
    message.isDeleted = true;
    await this.messageRepo.save(message);
  }

  buildPrivateChannelId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join(':');
  }
}
