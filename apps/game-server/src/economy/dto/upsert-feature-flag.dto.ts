import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertFeatureFlagDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  variant?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  description?: string;
}
