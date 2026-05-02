import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Race } from '../entities/game-state.entity';

export class SelectRaceDto {
  @ApiProperty({ enum: Race, description: 'Player race selection (only once, before level 2)' })
  @IsEnum(Race)
  race: Race;
}
