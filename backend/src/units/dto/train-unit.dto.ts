import { IsUUID, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TrainUnitDto {
  @ApiProperty({ description: 'Player ID who is training the unit' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ description: 'Unit type code (e.g. human_soldier, zerg_larva)' })
  @IsString()
  @IsNotEmpty()
  unitTypeCode: string;
}
