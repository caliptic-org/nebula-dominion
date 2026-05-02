import { IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class UpdateBuildingConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseMineralPerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseGasPerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseEnergyPerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePopulationPerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  energyConsumptionPerHour?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  levelScaleExponent?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
