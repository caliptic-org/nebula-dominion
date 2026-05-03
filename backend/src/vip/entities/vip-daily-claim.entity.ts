import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

export interface VipReward {
  type: 'gems' | 'xp' | 'item';
  amount: number;
  label: string;
}

@Entity('vip_daily_claims')
@Index(['userId'])
@Index(['userId', 'claimedAt'])
export class VipDailyClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'claimed_at', type: 'timestamptz' })
  claimedAt: Date;

  @Column({ type: 'jsonb' })
  rewards: VipReward[];
}
