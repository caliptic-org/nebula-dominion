import { IsString, Length, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAllianceDto {
  @ApiProperty({ example: 'Galaktik Muhafızlar', description: 'İttifak adı (3-100 karakter)' })
  @IsString()
  @Length(3, 100)
  name: string;

  @ApiProperty({ example: 'GM', description: 'İttifak etiketi (2-10 karakter)' })
  @IsString()
  @Length(2, 10)
  tag: string;

  @ApiPropertyOptional({ example: 'Galaksinin en güçlü ittifakı' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({ example: 'emblem_shield_gold' })
  @IsOptional()
  @IsString()
  emblem?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @ApiPropertyOptional({ default: 0, description: 'Katılmak için gereken minimum ELO' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3000)
  minElo?: number;
}
