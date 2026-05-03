import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum PvpMatchResult {
  WIN = 'win',
  LOSS = 'loss',
  DRAW = 'draw',
}

@Entity('pvp_match_records')
@Index(['playerId'])
@Index(['playerId', 'createdAt'])
export class PvpMatchRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'battle_id', type: 'uuid' })
  battleId: string;

  @Column({ name: 'opponent_id', type: 'uuid', nullable: true })
  opponentId: string | null;

  @Column({ name: 'is_bot_match', type: 'boolean', default: false })
  isBotMatch: boolean;

  @Column({ type: 'enum', enum: PvpMatchResult })
  result: PvpMatchResult;

  @Column({ name: 'consecutive_losses', type: 'int', default: 0 })
  consecutiveLosses: number;

  @Column({ name: 'player_power_score', type: 'int', default: 0 })
  playerPowerScore: number;

  @Column({ name: 'comeback_bonus_granted', type: 'boolean', default: false })
  comebackBonusGranted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
