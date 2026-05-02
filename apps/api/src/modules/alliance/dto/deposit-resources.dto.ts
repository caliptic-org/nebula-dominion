import { IsInt, Min, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DepositResourcesDto {
  @ApiPropertyOptional({ default: 0, description: 'Depozit edilecek mineral miktarı' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minerals?: number;

  @ApiPropertyOptional({ default: 0, description: 'Depozit edilecek enerji miktarı' })
  @IsOptional()
  @IsInt()
  @Min(0)
  energy?: number;
}
