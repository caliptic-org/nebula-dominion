import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum ComebackBonusStatus {
  PENDING = 'pending',
  CLAIMED = 'claimed',
  EXPIRED = 'expired',
}

@Entity('comeback_bonuses')
@Index(['playerId', 'status'])
export class ComebackBonus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'trigger_battle_id', type: 'uuid' })
  triggerBattleId: string;

  @Column({ type: 'enum', enum: ComebackBonusStatus, default: ComebackBonusStatus.PENDING })
  status: ComebackBonusStatus;

  @Column({ name: 'mineral_reward', type: 'int', default: 1000 })
  mineralReward: number;

  @Column({ name: 'gas_reward', type: 'int', default: 500 })
  gasReward: number;

  @Column({ name: 'free_heal', type: 'boolean', default: true })
  freeHeal: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'granted_at' })
  grantedAt: Date;

  @Column({ name: 'claimed_at', type: 'timestamptz', nullable: true })
  claimedAt: Date | null;
}
