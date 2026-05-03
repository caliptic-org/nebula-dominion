import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BotDifficulty } from '../entities/pvp-bot-profile.entity';
import { UnitSnapshot } from '../../battle/types/battle.types';

export class CreateBotProfileDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  race: string;

  @ApiProperty()
  @IsArray()
  units: UnitSnapshot[];

  @ApiPropertyOptional({ enum: BotDifficulty, default: BotDifficulty.MEDIUM })
  @IsOptional()
  @IsEnum(BotDifficulty)
  difficulty?: BotDifficulty;
}
