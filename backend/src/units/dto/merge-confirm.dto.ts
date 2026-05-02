import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString } from 'class-validator';

export class MergeConfirmDto {
  @ApiProperty({ description: 'Player confirming the merge' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ description: 'Merge session ID returned from POST /units/merge' })
  @IsString()
  sessionId: string;
}
