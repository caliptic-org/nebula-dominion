import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, ValidateNested, ArrayMaxSize, IsUUID, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { UnitSlotDto, CommanderSlotDto } from './unit-slot.dto';

export class UpdateFormationDto {
  @ApiProperty({ description: 'Formation display name', required: false })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiProperty({ type: [UnitSlotDto], description: 'Unit slots (max 10)', required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(10)
  @Type(() => UnitSlotDto)
  @IsOptional()
  unitSlots?: UnitSlotDto[];

  @ApiProperty({ type: [CommanderSlotDto], description: 'Commander slots (max 2)', required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(2)
  @Type(() => CommanderSlotDto)
  @IsOptional()
  commanderSlots?: CommanderSlotDto[];

  @ApiProperty({ description: 'Optional template preset ID', required: false })
  @IsUUID()
  @IsOptional()
  templateId?: string;
}
