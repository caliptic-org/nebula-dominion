import { IsEnum, IsInt, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MapActionType {
  ATTACK  = 'attack',
  SCOUT   = 'scout',
  GATHER  = 'gather',
  RALLY   = 'rally',
  DEFEND  = 'defend',
  UPGRADE = 'upgrade',
  FLEE    = 'flee',
}

export class MapActionDto {
  @ApiProperty({ description: 'Player UUID' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ enum: MapActionType, description: 'Action to perform' })
  @IsEnum(MapActionType)
  action: MapActionType;

  @ApiProperty({ description: 'Target column (0–25)', minimum: 0, maximum: 25 })
  @IsInt()
  @Min(0)
  @Max(25)
  targetCol: number;

  @ApiProperty({ description: 'Target row (0–19)', minimum: 0, maximum: 19 })
  @IsInt()
  @Min(0)
  @Max(19)
  targetRow: number;
}
