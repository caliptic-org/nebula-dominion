import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BattleActionType } from '../types/battle.types';

export class ExecuteTurnDto {
  @ApiProperty()
  @IsUUID()
  playerId: string;

  @ApiProperty({ enum: BattleActionType })
  @IsEnum(BattleActionType)
  actionType: BattleActionType;

  @ApiProperty({ description: 'UUID of the attacking unit owned by the player' })
  @IsUUID()
  attackerUnitId: string;

  @ApiPropertyOptional({ description: 'UUID of the target unit (server picks lowest-HP if omitted)' })
  @IsOptional()
  @IsUUID()
  targetUnitId?: string;
}
