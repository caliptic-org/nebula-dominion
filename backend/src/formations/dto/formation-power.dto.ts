import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { UnitSlotDto, CommanderSlotDto } from './unit-slot.dto';

export class FormationPowerDto {
  @ApiProperty({ description: 'Player ID for ownership validation' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ type: [UnitSlotDto], description: 'Unit slots to calculate power for' })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(10)
  @Type(() => UnitSlotDto)
  unitSlots: UnitSlotDto[];

  @ApiProperty({ type: [CommanderSlotDto], description: 'Commander slots to include in power calculation' })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(2)
  @Type(() => CommanderSlotDto)
  commanderSlots: CommanderSlotDto[];
}
