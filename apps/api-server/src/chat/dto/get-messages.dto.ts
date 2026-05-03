import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChatChannel } from '../entities/chat-message.entity';

export class GetMessagesDto {
  @ApiProperty({ enum: ChatChannel, description: 'Channel to fetch messages from' })
  @IsEnum(ChatChannel)
  channel: ChatChannel;

  @ApiPropertyOptional({ description: 'Guild ID (required when channel=guild)' })
  @IsOptional()
  @IsString()
  guildId?: string;

  @ApiPropertyOptional({ type: Number, default: 50, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Cursor — ISO timestamp of oldest message to paginate before' })
  @IsOptional()
  @IsString()
  before?: string;
}

export class GetDmMessagesDto {
  @ApiPropertyOptional({ type: Number, default: 50, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Cursor — ISO timestamp of oldest message to paginate before' })
  @IsOptional()
  @IsString()
  before?: string;
}
