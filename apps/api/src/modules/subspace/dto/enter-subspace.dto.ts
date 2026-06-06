import { IsString, IsArray, IsUUID, ArrayMinSize, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnterSubspaceDto {
  @ApiProperty({ description: 'Subspace bölgesi kodu', example: 'subspace_alpha' })
  @IsString()
  zoneCode: string;

  @ApiProperty({ description: 'Konuşlandırılacak birim kodları', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  unitCodes: string[];
}

/**
 * Inbound DTO for POST /subspace/battles.
 *
 * SECURITY NOTE (C4-3): `defenderId` is intentionally NOT accepted from the
 * client. Previously the controller forwarded the body field straight into
 * `battle.defenderId`, which let any authenticated caller spoof an attack
 * target. PvP matchmaking has to run server-side (or via the game-server's
 * dedicated matchmaking service) — never trust the attacker for this.
 *
 * For now only PvE battles are accepted here; `defenderId` is derived from
 * the active subspace session state on the server. PvP is rejected at the
 * service layer until a real matchmaking layer ships.
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
      "Saldıran birim listesi. Her eleman bir { unitId: uuid, ...stats } objesi olmalı; " +
      "unitId'ler çağıranın player_units kayıtlarında bulunmalı.",
    type: [Object],
  })
  @IsArray()
  @ArrayMinSize(1)
  attackerUnits: Array<{ unitId: string } & Record<string, unknown>>;
}
