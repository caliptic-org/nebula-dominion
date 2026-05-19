import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MergeUnitsDto {
  @ApiProperty({ description: 'ID of the source unit consumed by the merge' })
  @IsUUID()
  sourceUnitId: string;

  @ApiProperty({ description: 'ID of the target unit that absorbs the source' })
  @IsUUID()
  targetUnitId: string;
}
