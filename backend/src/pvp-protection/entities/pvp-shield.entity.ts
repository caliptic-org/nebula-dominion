import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('pvp_shields')
export class PvpShield {
  @PrimaryColumn({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'shield_expires_at', type: 'timestamptz' })
  shieldExpiresAt: Date;

  @Column({ name: 'opted_out', type: 'boolean', default: false })
  optedOut: boolean;

  @Column({ name: 'opted_out_at', type: 'timestamptz', nullable: true })
  optedOutAt: Date | null;

  @Column({ name: 'bot_matches_played', type: 'int', default: 0 })
  botMatchesPlayed: number;

  @Column({ name: 'human_only_matchmaking', type: 'boolean', default: false })
  humanOnlyMatchmaking: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
