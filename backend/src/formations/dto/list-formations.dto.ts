import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListFormationsDto {
  @ApiProperty({ description: 'Player ID to list formations for' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ description: 'Page number (1-based)', default: 1, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ description: 'Items per page', default: 20, required: false })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
