import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type VipSubscriptionStatus = 'active' | 'expired' | 'cancelled';

@Entity('vip_subscriptions')
@Index(['userId'])
@Index(['userId', 'status'])
export class VipSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'plan_id', type: 'varchar', length: 20 })
  planId: string;

  @Column({ type: 'varchar', length: 20 })
  status: VipSubscriptionStatus;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
