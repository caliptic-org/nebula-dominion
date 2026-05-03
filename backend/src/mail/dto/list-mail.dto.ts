import { IsBooleanString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MailType } from '../entities/mail.entity';

export class ListMailDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: MailType })
  @IsOptional()
  @IsEnum(MailType)
  type?: MailType;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBooleanString()
  isRead?: string;
}
