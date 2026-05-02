import { IsUUID, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitSnapshot } from '../../battle/types/battle.types';

export class FindMatchDto {
  @ApiProperty({ description: 'Attacking player ID' })
  @IsUUID()
  attackerId: string;

  @ApiProperty({ description: 'Attacker unit snapshots for power score calculation' })
  @IsArray()
  attackerUnits: UnitSnapshot[];

  @ApiPropertyOptional({ description: 'Candidate defender player IDs to match against' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  candidateDefenderIds?: string[];

  @ApiPropertyOptional({ description: 'Prefer human opponent over bot' })
  @IsOptional()
  @IsBoolean()
  preferHuman?: boolean;
}
