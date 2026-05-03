import { IsArray, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitSnapshot } from '../../battle/types/battle.types';

// attackerId is intentionally omitted — extracted from JWT on the controller
export class FindMatchDto {
  @ApiProperty({ description: 'Attacker unit snapshots for power score calculation' })
  @IsArray()
  attackerUnits: UnitSnapshot[];

  @ApiPropertyOptional({ description: 'Candidate defender player IDs to match against' })
  @IsOptional()
  @IsArray()
  candidateDefenderIds?: string[];

  @ApiPropertyOptional({ description: 'Prefer human opponent over bot' })
  @IsOptional()
  @IsBoolean()
  preferHuman?: boolean;
}
