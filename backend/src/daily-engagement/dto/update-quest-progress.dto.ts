import { IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuestType } from '../types/daily-engagement.types';

export class UpdateQuestProgressDto {
  @ApiProperty({ enum: QuestType, description: 'The quest type to update progress for' })
  @IsEnum(QuestType)
  questType: QuestType;

  @ApiProperty({ description: 'Amount to increment progress by', minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  increment: number;
}
