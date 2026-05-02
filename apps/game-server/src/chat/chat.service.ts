import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage, ChannelType } from './entities/chat-message.entity';
import { SendMessageDto } from './dto/send-message.dto';

const HISTORY_LIMIT = 50;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
  ) {}

  async sendMessage(senderId: string, dto: SendMessageDto): Promise<ChatMessage> {
    if (dto.channelType === ChannelType.PRIVATE && !dto.channelId) {
      throw new BadRequestException('Özel mesaj için alıcı ID gereklidir');
    }
    if (dto.channelType === ChannelType.ALLIANCE && !dto.channelId) {
      throw new BadRequestException('İttifak kanalı için ittifak ID gereklidir');
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
