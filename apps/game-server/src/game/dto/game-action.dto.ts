import { IsEnum, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export enum ActionType {
  DEPLOY_UNIT = 'deploy_unit',
  MOVE_UNIT = 'move_unit',
  ATTACK = 'attack',
  USE_ABILITY = 'use_ability',
  MERGE_UNITS = 'merge_units',
  MUTATE_UNIT = 'mutate_unit',
  END_TURN = 'end_turn',
  SURRENDER = 'surrender',
}

export class GameActionDto {
  @IsString()
  roomId: string;

  @IsEnum(ActionType)
  type: ActionType;

  @IsNumber()
  @Min(0)
  sequenceNumber: number;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
