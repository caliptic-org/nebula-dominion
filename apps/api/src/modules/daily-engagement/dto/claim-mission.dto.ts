import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MissionType } from '../entities/mission-claim.entity';

export class ClaimRewardDto {
  @ApiPropertyOptional({ description: 'Gold / mineral reward', example: 5000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  gold?: number;

  @ApiPropertyOptional({ description: 'Gem / science reward', example: 25 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  gems?: number;

  @ApiPropertyOptional({ description: 'XP reward', example: 1200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  xp?: number;
}

export class ClaimMissionDto {
  @ApiProperty({ description: 'Frontend mission id', example: 'story-2' })
  @IsString()
  missionId: string;

  @ApiProperty({
    description: 'Mission category',
    enum: ['story', 'weekly', 'achievement', 'daily'],
  })
  @IsString()
  @IsIn(['story', 'weekly', 'achievement', 'daily'])
  missionType: MissionType;

  @ApiProperty({ type: ClaimRewardDto })
  @IsObject()
  reward: ClaimRewardDto;
}
