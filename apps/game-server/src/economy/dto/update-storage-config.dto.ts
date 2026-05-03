import { ArrayMaxSize, ArrayMinSize, IsArray, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class UpdateStorageConfigDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  baseCap?: number;

  /** Must be exactly 6 values — one multiplier per age */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(6)
  @ArrayMaxSize(6)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  ageMultipliers?: number[];

  @IsOptional()
  @IsString()
  description?: string;
}
