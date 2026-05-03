import { IsUUID, IsArray, IsNotEmpty, IsOptional, ValidateNested, IsString, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UnitSnapshotDto {
  @ApiProperty()
  @IsUUID()
  unitId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  race: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  tierLevel: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  attack: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  defense: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  maxHp: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  speed: number;
}

export class CreateBattleDto {
  @ApiProperty()
  @IsUUID()
  attackerId: string;

  @ApiProperty()
  @IsUUID()
  defenderId: string;

  @ApiProperty({ type: [UnitSnapshotDto] })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UnitSnapshotDto)
  attackerUnits: UnitSnapshotDto[];

  @ApiProperty({ type: [UnitSnapshotDto] })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UnitSnapshotDto)
  defenderUnits: UnitSnapshotDto[];

  @ApiPropertyOptional({ description: 'Whether the opponent is a bot (PvE)' })
  @IsOptional()
  @IsBoolean()
  isBotOpponent?: boolean;

  @ApiPropertyOptional({ description: "Caller's current session ID for analytics tracking" })
  @IsOptional()
  @IsString()
  attackerSessionId?: string;
}
