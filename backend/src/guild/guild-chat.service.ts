import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { GuildMute } from './entities/guild-mute.entity';
import { GuildEvent } from './entities/guild-event.entity';
import { ProfanityService } from './profanity.service';
import { ContributionService } from './contribution.service';
import { GuildMembershipService } from './guild-membership.service';
import { RedisService } from '../redis/redis.service';
import { AnalyticsService } from '../analytics/analytics.service';

export const ROLLING_WINDOW_SIZE = 200;
export const MESSAGE_COOLDOWN_SECONDS = 1;
export const MESSAGES_PER_MINUTE_LIMIT = 20;

export interface ChatMessageView {
  id: string;
  guildId: string;
  userId: string;
  content: string;
  filtered: boolean;
  createdAt: string;
}

@Injectable()
export class GuildChatService {
  private readonly logger = new Logger(GuildChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(GuildMute)
    private readonly muteRepo: Repository<GuildMute>,
    @InjectRepository(GuildEvent)
    private readonly eventRepo: Repository<GuildEvent>,
    private readonly profanity: ProfanityService,
    private readonly contribution: ContributionService,
    private readonly membership: GuildMembershipService,
    private readonly redis: RedisService,
    private readonly analytics: AnalyticsService,
  ) {}

  async assertNotMuted(guildId: string, userId: string): Promise<void> {
    const mute = await this.muteRepo
      .createQueryBuilder('m')
      .where('m.guild_id = :guildId AND m.user_id = :userId AND m.expires_at > NOW()', { guildId, userId })
      .orderBy('m.expires_at', 'DESC')
      .getOne();
    if (mute) {
      throw new ForbiddenException(`Muted until ${mute.expiresAt.toISOString()}`);
    }
  }

  private async checkRateLimit(userId: string): Promise<void> {
    const cooldownKey = `chat:cd:${userId}`;
    const ok = await this.redis.setnx(cooldownKey, '1', MESSAGE_COOLDOWN_SECONDS);
    if (!ok) {
      throw new HttpException(
        { error: 'rate_limited', reason: 'cooldown', retryAfterSeconds: MESSAGE_COOLDOWN_SECONDS },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const minuteKey = `chat:minute:${userId}`;
    const count = await this.redis.incrWithExpire(minuteKey, 60);
    if (count > MESSAGES_PER_MINUTE_LIMIT) {
      const ttl = await this.redis.ttl(minuteKey);
      throw new HttpException(
        { error: 'rate_limited', reason: 'minute_quota', retryAfterSeconds: ttl > 0 ? ttl : 60 },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async sendMessage(userId: string, content: string): Promise<ChatMessageView> {
    const member = await this.membership.getMember(userId);
    await this.assertNotMuted(member.guildId, userId);
    await this.checkRateLimit(userId);

    const trimmed = content.trim();
    if (!trimmed) {
      throw new HttpException({ error: 'empty_content' }, HttpStatus.BAD_REQUEST);
    }
    const { clean, filtered } = await this.profanity.filter(trimmed);

    const saved = await this.messageRepo.save(
      this.messageRepo.create({ guildId: member.guildId, userId, content: clean, filtered }),
    );

    await this.trimRollingWindow(member.guildId);
    await this.contribution.addChatMessage(member.guildId, userId);

    await this.eventRepo.save(
      this.eventRepo.create({
        guildId: member.guildId,
        userId,
        eventType: 'chat_message',
        payload: { messageId: saved.id, filtered },
      }),
    );

    await this.analytics.trackServer({
      event_type: 'guild_activity',
      user_id: userId,
      session_id: 'system',
      properties: { kind: 'chat_msg', guild_id: member.guildId, filtered },
    });

    return this.toView(saved);
  }

  private async trimRollingWindow(guildId: string): Promise<void> {
    const total = await this.messageRepo.count({ where: { guildId } });
    if (total <= ROLLING_WINDOW_SIZE) return;

    // Find the createdAt cutoff for the 200th most recent message
    const cutoff = await this.messageRepo.find({
      where: { guildId },
      order: { createdAt: 'DESC' },
      skip: ROLLING_WINDOW_SIZE - 1,
      take: 1,
    });
    if (!cutoff.length) return;

    await this.messageRepo
      .createQueryBuilder()
      .delete()
      .where('guild_id = :guildId AND created_at < :cutoff', {
        guildId,
        cutoff: cutoff[0].createdAt,
      })
      .execute();
  }

  async getHistory(guildId: string, before?: string): Promise<ChatMessageView[]> {
    let beforeDate: Date | undefined;
    if (before) {
      const ref = await this.messageRepo.findOne({ where: { id: before } });
      beforeDate = ref?.createdAt;
    }
    const where = beforeDate ? { guildId, createdAt: LessThan(beforeDate) } : { guildId };
    const rows = await this.messageRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return rows.reverse().map((m) => this.toView(m));
  }

  async getRollingWindow(guildId: string): Promise<ChatMessageView[]> {
    const rows = await this.messageRepo.find({
      where: { guildId },
      order: { createdAt: 'DESC' },
      take: ROLLING_WINDOW_SIZE,
    });
    return rows.reverse().map((m) => this.toView(m));
  }

  private toView(m: ChatMessage): ChatMessageView {
    return {
      id: m.id,
      guildId: m.guildId,
      userId: m.userId,
      content: m.content,
      filtered: m.filtered,
      createdAt: m.createdAt.toISOString(),
    };
  }
}
