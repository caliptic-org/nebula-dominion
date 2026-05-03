import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ChatQueryDto {
  @ApiPropertyOptional({ description: 'Bu mesaj UUID\'den önce getir (cursor)' })
  @IsOptional()
  @IsUUID()
  before?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100, description: 'Sayfa başına mesaj sayısı' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
