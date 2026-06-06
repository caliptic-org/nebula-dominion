import {
  IsString,
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  IsIn,
  IsInt,
  Max,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EnterSubspaceDto {
  @ApiProperty({ description: 'Subspace bölgesi kodu', example: 'subspace_alpha' })
  @IsString()
  @MaxLength(64)
  zoneCode: string;

  @ApiProperty({ description: 'Konuşlandırılacak birim kodları', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  unitCodes: string[];
}

/**
 * One requested unit slot for a subspace battle start.
 *
 * SECURITY NOTE (HIGH ECON-C6-05 — prior vulnerability):
 *   Before this DTO existed, attackerUnits was typed
 *   `Array<{ unitId: string } & Record<string, unknown>>` and the
 *   service stored the raw payload onto `subspace_battles.attacker_units`
 *   verbatim. computeBattleResult() then read `(u.attack as number) || 100`
 *   directly from that snapshot. A caller could POST
 *     { attackerUnits: [{ unitId: <owned>, attack: 99_999_999 }],
 *       defenderUnits: [{ attack: 0 }] }
 *   and force a guaranteed win plus a `rewardsEarned` credit.
 *
 *   The fix is two-sided:
 *   1. This DTO only accepts `{ unitId, count }`. All stat fields are
 *      stripped by class-transformer's `@Type(() => UnitRefDto)` +
 *      Nest's `whitelist: true, forbidNonWhitelisted: true` global pipe
 *      (main.ts), so the wire bytes never reach the service layer at all.
 *   2. SubspaceService.startBattle resolves each unitId against
 *      player_units (ownership check + stat lookup) and stamps the
 *      canonical {type, attack, defense, hp, raceBonus} snapshot on the
 *      battle row using server-side UNIT_STATS_BY_TYPE +
 *      RACE_BONUSES. resolveBattle reads from that server-derived
 *      snapshot only — never from the wire.
 */
export class SubspaceUnitRefDto {
  @ApiProperty({
    description:
      'UUID of a player_units row the caller owns. Validated against ' +
      'player_units.player_id = userId at startBattle; mismatched ids are ' +
      'rejected with 403.',
  })
  @IsUUID()
  unitId: string;

  @ApiProperty({
    description:
      'How many of this unit to deploy. Bounded [1, 99] to keep subspace ' +
      'combat math sane and to defang count-side multiplier exploits.',
    minimum: 1,
    maximum: 99,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(99)
  count: number;
}

/**
 * Inbound DTO for POST /subspace/battles.
 *
 * SECURITY NOTE (C4-3 + HIGH ECON-C6-05):
 *   - `defenderId` is intentionally NOT accepted from the client.
 *     Previously the controller forwarded the body field straight into
 *     `battle.defenderId`, which let any authenticated caller spoof an
 *     attack target. PvP matchmaking has to run server-side (or via the
 *     game-server's dedicated matchmaking service) — never trust the
 *     attacker for this.
 *   - `attackerUnits` is `SubspaceUnitRefDto[]` only. Stat fields are
 *     stripped at the validation pipe; the service re-derives stats from
 *     player_units + UNIT_STATS_BY_TYPE.
 *
 * For now only PvE battles are accepted here; `defenderId` is null and
 * defender roster is synthesized from the zone tier. PvP is rejected at
 * the service layer until a real matchmaking layer ships.
 */
export class StartSubspaceBattleDto {
  @ApiProperty({
    description: 'Savaş türü (PvP şu an devre dışı — matchmaking eksik)',
    enum: ['pve_raid', 'boss_hunt'],
  })
  @IsString()
  @IsIn(['pve_raid', 'boss_hunt'])
  battleType: string;

  @ApiProperty({ description: 'Subspace bölgesi ID' })
  @IsUUID()
  zoneId: string;

  @ApiProperty({
    description:
      "Saldıran birimler. Her eleman { unitId, count }; stat alanları " +
      "(attack/defense/hp/raceBonus) artık client'tan KABUL EDİLMEZ — " +
      'sunucu UNIT_STATS_BY_TYPE + RACE_BONUSES tablosundan türetir.',
    type: [SubspaceUnitRefDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SubspaceUnitRefDto)
  attackerUnits: SubspaceUnitRefDto[];
}
