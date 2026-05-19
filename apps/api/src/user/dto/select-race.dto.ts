import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Race } from '../entities/race.enum';

export class SelectRaceDto {
  @ApiProperty({ enum: Race, description: 'Race chosen by the player (one-time)' })
  @IsEnum(Race)
  race: Race;
}
