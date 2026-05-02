import { IsString, IsArray, IsUUID, ArrayMinSize } from 'class-validator';
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

export class StartSubspaceBattleDto {
  @ApiProperty({ description: 'Savaş türü', enum: ['pvp', 'pve_raid', 'guild_war', 'boss_hunt'] })
  @IsString()
  battleType: string;

  @ApiProperty({ description: 'Subspace bölgesi ID' })
  @IsUUID()
  zoneId: string;

  @ApiProperty({ description: 'Saldıran birim listesi', type: [Object] })
  @IsArray()
  attackerUnits: Record<string, unknown>[];

  @ApiProperty({ description: 'Savunan kullanıcı ID (PvP için)', required: false })
  @IsUUID()
  defenderId?: string;
}
