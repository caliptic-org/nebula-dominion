import { IsEnum, IsString, IsOptional } from 'class-validator';
import { XpSource } from '../config/level-config';

export class AwardXpDto {
  @IsString()
  userId: string;

  @IsEnum(XpSource)
  source: XpSource;

  @IsString()
  @IsOptional()
  referenceId?: string;
}
