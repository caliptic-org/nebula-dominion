import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatChannel } from '../entities/chat-message.entity';

export class SendMessageDto {
  @ApiProperty({ enum: ChatChannel })
  @IsEnum(ChatChannel)
  channel: ChatChannel;

  @ApiPropertyOptional({ description: 'Guild ID (required when channel=guild)' })
  @IsOptional()
  @IsString()
  guildId?: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @Length(1, 500)
  content: string;
}

export class SendDmDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @Length(1, 500)
  content: string;
}

export class BlockUserDto {
  @ApiProperty({ description: 'User ID to block' })
  @IsString()
  userId: string;
}
