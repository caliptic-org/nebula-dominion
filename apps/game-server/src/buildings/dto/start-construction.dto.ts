import { IsEnum, IsInt, Min, Max } from 'class-validator';
import { BuildingType } from '../entities/building.entity';

export class StartConstructionDto {
  @IsEnum(BuildingType)
  type: BuildingType;

  @IsInt()
  @Min(0)
  @Max(63)
  positionX: number;

  @IsInt()
  @Min(0)
  @Max(63)
  positionY: number;
}
