import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class MuteMemberDto {
  @IsUUID()
  userId: string;

  @IsInt()
  @Min(60)
  @Max(86400 * 7)
  durationSeconds: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class ReportMessageDto {
  @IsUUID()
  targetUserId: string;

  @IsOptional()
  @IsUUID()
  messageId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class AddProfanityWordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  word: string;
}
