import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}

export class ChatHistoryQueryDto {
  @IsOptional()
  @IsUUID()
  before?: string;
}
