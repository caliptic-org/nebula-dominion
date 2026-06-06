import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * One requested deployment slot from the client.
 *
 * SECURITY NOTE (E2 — prior vulnerability):
 *   Before this DTO existed the controller accepted
 *   `unitsDeployed: Record<string, unknown>[]`, which the service stored
 *   verbatim and then iterated as `attack * count * raceBonus`. A client
 *   could trivially POST `{attack: 999999, count: 999, raceBonus: 999}`
 *   and one-shot any boss (capped to 10 per-attack hits by the 10%-HP
 *   cap). damageDealt drives the leaderboard, so the exploit also
 *   trashes ranking.
 *
 *   The fix is two-sided:
 *   1. This DTO only accepts a unit IDENTIFIER plus a deploy COUNT.
 *      attack/raceBonus are no longer accepted from the wire AT ALL.
 *   2. BossService.startAttempt then resolves each unitId against the
 *      caller's player_units rows (ownership check) and stamps the
 *      canonical {type, attack, count, raceBonus} on the attempt row
 *      using server-side UNIT_CONFIGS + applyRaceBonuses(). attackBoss
 *      reads from that server-derived snapshot — never from the wire.
 */
export class BossUnitDeployDto {
  @ApiProperty({
    description:
      'UUID of a player_units row the caller owns. Validated against ' +
      'player_units.player_id = userId on startAttempt; mismatched ids ' +
      'are rejected with 403.',
  })
  @IsString()
  @MaxLength(64)
  unitId: string;

  @ApiProperty({
    description:
      'How many of this unit to deploy. Bounded [1, 99] to keep boss ' +
      'math sane and to defang count-side multiplier exploits.',
    minimum: 1,
    maximum: 99,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(99)
  count: number;
}

export class StartAttemptDto {
  @ApiProperty({
    description: 'Boss kodu (örn: devouring_worm_phase1)',
    example: 'devouring_worm_phase1',
  })
  @IsString()
  @MaxLength(50)
  bossCode: string;

  @ApiProperty({
    type: [BossUnitDeployDto],
    description:
      "Konuşlandırılacak birimler. Her eleman { unitId, count } şeklinde; " +
      "stat alanları (attack/raceBonus) artık client'tan KABUL EDİLMEZ — " +
      'sunucu kendi UNIT_CONFIGS tablosundan türetir.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BossUnitDeployDto)
  unitsDeployed: BossUnitDeployDto[];
}

export class AttackBossDto {
  @ApiPropertyOptional({
    description:
      'Optional boss mekanik adı (örn: "tail_sweep"). Boss tarafının ' +
      'phase mechanics listesinde olmalı; bilinmeyen ad sessizce yutulur.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  mechanicName?: string;
}
