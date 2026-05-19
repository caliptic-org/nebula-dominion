import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UnitType } from '../entities/unit.entity';

export class MutateUnitDto {
  @ApiProperty({ description: 'ID of the unit to mutate (Zerg only)' })
  @IsUUID()
  unitId: string;

  @ApiPropertyOptional({
    enum: UnitType,
    description: 'Target unit type after mutation (optional — defaults to next level same type)',
  })
  @IsOptional()
  @IsEnum(UnitType)
  targetType?: UnitType;
}
