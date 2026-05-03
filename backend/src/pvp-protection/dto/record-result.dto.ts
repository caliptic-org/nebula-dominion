import { IsUUID, IsEnum, IsBoolean, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PvpMatchResult } from '../entities/pvp-match-record.entity';

// playerId is intentionally omitted — extracted from JWT on the controller
export class RecordResultDto {
  @ApiProperty()
  @IsUUID()
  battleId: string;

  @ApiProperty({ enum: PvpMatchResult })
  @IsEnum(PvpMatchResult)
  result: PvpMatchResult;

  @ApiProperty()
  @IsBoolean()
  isBotMatch: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  opponentId?: string;

  @ApiProperty()
  @IsInt()
  playerPowerScore: number;
}
