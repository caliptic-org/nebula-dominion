import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsArray, IsOptional, ValidateNested, ArrayMaxSize, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { UnitSlotDto, CommanderSlotDto } from './unit-slot.dto';

export class CreateFormationDto {
  @ApiProperty({ description: 'Player who owns this formation' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ description: 'Formation display name', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ type: [UnitSlotDto], description: 'Unit slots (max 10)' })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(10)
  @Type(() => UnitSlotDto)
  unitSlots: UnitSlotDto[];

  @ApiProperty({ type: [CommanderSlotDto], description: 'Commander slots (max 2)' })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(2)
  @Type(() => CommanderSlotDto)
  commanderSlots: CommanderSlotDto[];

  @ApiProperty({ description: 'Optional template preset ID', required: false })
  @IsUUID()
  @IsOptional()
  templateId?: string;
}
