import { IsString, IsEnum, IsOptional, Length, IsUUID } from 'class-validator';
import { ChannelType } from '../entities/chat-message.entity';

export class SendMessageDto {
  @IsEnum(ChannelType)
  channelType: ChannelType;

  @IsOptional()
  @IsString()
  channelId?: string;

  @IsString()
  @Length(1, 500)
  content: string;
}

export class PrivateMessageDto {
  @IsUUID()
  recipientId: string;

  @IsString()
  @Length(1, 500)
  content: string;
}
