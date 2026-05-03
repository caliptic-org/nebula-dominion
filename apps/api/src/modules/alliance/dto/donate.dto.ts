import { IsInt, Min, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DonateDto {
  @ApiPropertyOptional({ default: 0, description: 'Bağışlanacak mineral miktarı' })
  @IsOptional()
  @IsInt()
  @Min(0)
  mineral?: number;

  @ApiPropertyOptional({ default: 0, description: 'Bağışlanacak gaz miktarı' })
  @IsOptional()
  @IsInt()
  @Min(0)
  gas?: number;

  @ApiPropertyOptional({ default: 0, description: 'Bağışlanacak enerji miktarı' })
  @IsOptional()
  @IsInt()
  @Min(0)
  energy?: number;
}
