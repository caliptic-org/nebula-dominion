import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LeaderboardCategory {
  POWER = 'power',
  PVP = 'pvp',
  ALLIANCE = 'alliance',
}

export enum LeaderboardPeriod {
  WEEKLY = 'weekly',
  SEASONAL = 'seasonal',
}

export class V1LeaderboardQueryDto {
  @ApiProperty({ enum: LeaderboardCategory })
  @IsEnum(LeaderboardCategory)
  category: LeaderboardCategory;

  @ApiProperty({ enum: LeaderboardPeriod })
  @IsEnum(LeaderboardPeriod)
  period: LeaderboardPeriod;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;
}

export class V1MeQueryDto {
  @ApiProperty({ enum: LeaderboardCategory })
  @IsEnum(LeaderboardCategory)
  category: LeaderboardCategory;

  @ApiProperty({ enum: LeaderboardPeriod })
  @IsEnum(LeaderboardPeriod)
  period: LeaderboardPeriod;
}

export class V1PeriodQueryDto {
  @ApiProperty({ enum: LeaderboardPeriod })
  @IsEnum(LeaderboardPeriod)
  type: LeaderboardPeriod;
}
