import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  TooManyRequestsException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ChatMessage, ChatChannel, ChatMessageType } from './entities/chat-message.entity';
import { DmConversation } from './entities/dm-conversation.entity';
import { DmMessage } from './entities/dm-message.entity';
import { DmBlock } from './entities/dm-block.entity';
import { GuildMembership } from './entities/guild-membership.entity';
import { SendMessageDto, SendDmDto } from './dto/send-message.dto';
import { GetMessagesDto, GetDmMessagesDto } from './dto/get-messages.dto';

// Token bucket: [lastRefillTs, tokens]
type RateBucket = { lastTs: number; tokens: number };

@Injectable()
export class ChatService {
  // In-memory rate limiting buckets per user
  private readonly globalBuckets = new Map<string, RateBucket>();
  private readonly dmBuckets = new Map<string, RateBucket>();

  // global: 1 msg/sec, dm: 0.5 msg/sec
  private readonly GLOBAL_RATE = 1;
  private readonly DM_RATE = 0.5;
  private readonly BUCKET_CAPACITY = 3;

  constructor(
    @InjectRepository(ChatMessage)
    private readonly msgRepo: Repository<ChatMessage>,
    @InjectRepository(DmConversation)
    private readonly convRepo: Repository<DmConversation>,
    @InjectRepository(DmMessage)
    private readonly dmMsgRepo: Repository<DmMessage>,
    @InjectRepository(DmBlock)
    private readonly blockRepo: Repository<DmBlock>,
    @InjectRepository(GuildMembership)
    private readonly guildRepo: Repository<GuildMembership>,
  ) {}

  // ── Rate Limiting ────────────────────────────────────────────────────────

  private checkRateLimit(buckets: Map<string, RateBucket>, userId: string, rate: number): void {
    const now = Date.now() / 1000;
    let bucket = buckets.get(userId);

    if (!bucket) {
      bucket = { lastTs: now, tokens: this.BUCKET_CAPACITY };
      buckets.set(userId, bucket);
    }

    const elapsed = now - bucket.lastTs;
    bucket.tokens = Math.min(this.BUCKET_CAPACITY, bucket.tokens + elapsed * rate);
    bucket.lastTs = now;

    if (bucket.tokens < 1) {
      throw new TooManyRequestsException('Çok fazla mesaj gönderdiniz, lütfen bekleyin');
    }

    bucket.tokens -= 1;
  }

  // ── Online Status (in-memory, WebSocket manages this) ───────────────────

  private readonly onlineUsers = new Map<string, Date>();

  markOnline(userId: string): void {
    this.onlineUsers.set(userId, new Date());
  }

  markOffline(userId: string): void {
    this.onlineUsers.delete(userId);
  }

  getOnlineCount(): number {
    return this.onlineUsers.size;
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  // ── Global / Guild Messages ──────────────────────────────────────────────

  async getMessages(dto: GetMessagesDto): Promise<ChatMessage[]> {
    const { channel, guildId, limit = 50, before } = dto;

    const qb = this.msgRepo
      .createQueryBuilder('m')
      .where('m.channel = :channel', { channel })
      .andWhere('m.isDeleted = false')
      .orderBy('m.createdAt', 'DESC')
      .take(limit);

    if (channel === ChatChannel.GUILD) {
      if (!guildId) throw new BadRequestException('guildId is required for guild channel');
      qb.andWhere('m.channelId = :guildId', { guildId });
    }

    if (before) {
      const cursor = new Date(before);
      if (isNaN(cursor.getTime())) throw new BadRequestException('Invalid before cursor');
      qb.andWhere('m.createdAt < :cursor', { cursor });
    }

    const messages = await qb.getMany();
    return messages.reverse();
  }

  async sendMessage(userId: string, dto: SendMessageDto, race?: string): Promise<ChatMessage> {
    this.checkRateLimit(this.globalBuckets, userId, this.GLOBAL_RATE);

    if (dto.channel === ChatChannel.GUILD) {
      if (!dto.guildId) throw new BadRequestException('guildId is required for guild channel');
      await this.assertGuildMember(userId, dto.guildId);
    }

    const msg = this.msgRepo.create({
      channel: dto.channel,
      channelId: dto.guildId ?? null,
      authorId: userId,
      race: race ?? null,
      content: dto.content,
      type: ChatMessageType.PLAYER,
    });

    return this.msgRepo.save(msg);
  }

  private async assertGuildMember(userId: string, guildId: string): Promise<void> {
    const membership = await this.guildRepo.findOne({ where: { guildId, userId } });
    if (!membership) {
      throw new ForbiddenException('Bu lonca kanalına erişim yetkiniz yok');
    }
  }

  // ── DM Conversations ─────────────────────────────────────────────────────

  async getDmConversations(userId: string): Promise<object[]> {
    const conversations = await this.convRepo
      .createQueryBuilder('c')
      .where('c.user1Id = :userId OR c.user2Id = :userId', { userId })
      .orderBy('c.updatedAt', 'DESC')
      .getMany();

    return conversations.map((conv) => {
      const isUser1 = conv.user1Id === userId;
      const participantId = isUser1 ? conv.user2Id : conv.user1Id;
      const unreadCount = isUser1 ? conv.user1Unread : conv.user2Unread;

      return {
        id: conv.id,
        participantId,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        isOnline: this.isOnline(participantId),
        updatedAt: conv.updatedAt,
      };
    });
  }

  // ── DM Messages ──────────────────────────────────────────────────────────

  async getDmMessages(
    requesterId: string,
    targetUserId: string,
    dto: GetDmMessagesDto,
  ): Promise<DmMessage[]> {
    const conv = await this.findOrCreateConversation(requesterId, targetUserId);

    const { limit = 50, before } = dto;
    const qb = this.dmMsgRepo
      .createQueryBuilder('m')
      .where('m.conversationId = :convId', { convId: conv.id })
      .andWhere('m.isDeleted = false')
      .orderBy('m.createdAt', 'DESC')
      .take(limit);

    if (before) {
      const cursor = new Date(before);
      if (isNaN(cursor.getTime())) throw new BadRequestException('Invalid before cursor');
      qb.andWhere('m.createdAt < :cursor', { cursor });
    }

    // Mark as read
    await this.convRepo.update(conv.id, {
      ...(conv.user1Id === requesterId ? { user1Unread: 0 } : { user2Unread: 0 }),
    });

    const messages = await qb.getMany();
    return messages.reverse();
  }

  async sendDm(
    senderId: string,
    recipientId: string,
    dto: SendDmDto,
  ): Promise<{ message: DmMessage; conversationId: string }> {
    if (senderId === recipientId) {
      throw new BadRequestException('Kendinize DM gönderemezsiniz');
    }

    this.checkRateLimit(this.dmBuckets, senderId, this.DM_RATE);

    await this.assertNotBlocked(senderId, recipientId);

    const conv = await this.findOrCreateConversation(senderId, recipientId);

    const msg = this.dmMsgRepo.create({
      conversationId: conv.id,
      senderId,
      content: dto.content,
    });

    const saved = await this.dmMsgRepo.save(msg);

    // Update conversation metadata — increment unread for the recipient
    const isUser1Sender = conv.user1Id === senderId;
    const preview = dto.content.length > 100 ? dto.content.substring(0, 100) + '…' : dto.content;
    if (isUser1Sender) {
      await this.convRepo
        .createQueryBuilder()
        .update()
        .set({
          lastMessage: preview,
          lastMessageAt: saved.createdAt,
          user2Unread: () => 'user2_unread + 1',
        })
        .where('id = :id', { id: conv.id })
        .execute();
    } else {
      await this.convRepo
        .createQueryBuilder()
        .update()
        .set({
          lastMessage: preview,
          lastMessageAt: saved.createdAt,
          user1Unread: () => 'user1_unread + 1',
        })
        .where('id = :id', { id: conv.id })
        .execute();
    }

    return { message: saved, conversationId: conv.id };
  }

  private async findOrCreateConversation(
    userId1: string,
    userId2: string,
  ): Promise<DmConversation> {
    const [u1, u2] = [userId1, userId2].sort();

    let conv = await this.convRepo.findOne({
      where: { user1Id: u1, user2Id: u2 },
    });

    if (!conv) {
      conv = this.convRepo.create({ user1Id: u1, user2Id: u2 });
      conv = await this.convRepo.save(conv);
    }

    return conv;
  }

  private async assertNotBlocked(senderId: string, recipientId: string): Promise<void> {
    const block = await this.blockRepo.findOne({
      where: [
        { blockerId: recipientId, blockedId: senderId },
        { blockerId: senderId, blockedId: recipientId },
      ],
    });

    if (block) {
      throw new ForbiddenException('Bu kullanıcıyla DM gönderemezsiniz');
    }
  }

  // ── Block / Unblock ──────────────────────────────────────────────────────

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw new BadRequestException('Kendinizi engelleyemezsiniz');
    }

    const existing = await this.blockRepo.findOne({
      where: { blockerId, blockedId },
    });

    if (!existing) {
      const block = this.blockRepo.create({ blockerId, blockedId });
      await this.blockRepo.save(block);
    }
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.blockRepo.delete({ blockerId, blockedId });
  }

  async getBlockedUsers(userId: string): Promise<DmBlock[]> {
    return this.blockRepo.find({ where: { blockerId: userId } });
  }
}
