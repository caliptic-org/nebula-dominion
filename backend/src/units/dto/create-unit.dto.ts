import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, IsUUID, Min, Max, IsArray, IsOptional } from 'class-validator';
import { UnitRace } from '../types/units.types';

export class CreateUnitDto {
  @ApiProperty({ description: 'Player who owns this unit' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ description: 'Unit display name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: UnitRace })
  @IsEnum(UnitRace)
  race: UnitRace;

  @ApiProperty({ minimum: 1, maximum: 54, default: 1 })
  @IsInt()
  @Min(1)
  @Max(54)
  tierLevel: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  attack: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  defense: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  hp: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  speed: number;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  abilities?: string[];
}
