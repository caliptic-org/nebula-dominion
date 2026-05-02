import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { UnitRace } from '../types/units.types';

export class QueryMutationsDto {
  @ApiPropertyOptional({ enum: UnitRace })
  @IsEnum(UnitRace)
  @IsOptional()
  race1?: UnitRace;

  @ApiPropertyOptional({ enum: UnitRace })
  @IsEnum(UnitRace)
  @IsOptional()
  race2?: UnitRace;

  @ApiPropertyOptional({ minimum: 1, maximum: 54 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  minTier?: number;
}
