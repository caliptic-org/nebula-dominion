import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BattleActionType } from '../types/battle.types';

// playerId is intentionally omitted — extracted from JWT on the controller
export class ExecuteTurnDto {
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
