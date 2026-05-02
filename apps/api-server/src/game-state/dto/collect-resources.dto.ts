import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class CollectResourcesDto {
  @ApiPropertyOptional({ description: 'Minerals to collect', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minerals?: number;

  @ApiPropertyOptional({ description: 'Energy to collect', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  energy?: number;

  @ApiPropertyOptional({ description: 'Dark matter to collect', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  darkMatter?: number;
}
