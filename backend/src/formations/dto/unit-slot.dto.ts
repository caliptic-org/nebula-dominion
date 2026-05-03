import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, Max } from 'class-validator';

export class UnitSlotDto {
  @ApiProperty({ description: 'Unit ID for this slot' })
  @IsUUID()
  unitId: string;

  @ApiProperty({ description: 'Position index in the formation (0–9)', minimum: 0, maximum: 9 })
  @IsInt()
  @Min(0)
  @Max(9)
  position: number;
}

export class CommanderSlotDto {
  @ApiProperty({ description: 'Commander (unit) ID for this slot' })
  @IsUUID()
  commanderId: string;

  @ApiProperty({ description: 'Position index for this commander (0–1)', minimum: 0, maximum: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  position: number;
}
