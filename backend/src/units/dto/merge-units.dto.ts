import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MergeUnitsDto {
  @ApiProperty({ description: 'Player initiating the merge' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ description: 'First unit ID to merge' })
  @IsUUID()
  unit1Id: string;

  @ApiProperty({ description: 'Second unit ID to merge' })
  @IsUUID()
  unit2Id: string;
}
