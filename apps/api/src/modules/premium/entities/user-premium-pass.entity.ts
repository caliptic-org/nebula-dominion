import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PremiumPass } from './premium-pass.entity';

@Entity('user_premium_passes')
export class UserPremiumPass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'premium_pass_id' })
  premiumPassId: string;

  @ManyToOne(() => PremiumPass)
  @JoinColumn({ name: 'premium_pass_id' })
  premiumPass: PremiumPass;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'NOW()' })
  startedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'auto_renew', default: false })
  autoRenew: boolean;

  @Column({ name: 'current_tier', type: 'int', default: 0 })
  currentTier: number;

  @Column({ name: 'tier_xp', type: 'int', default: 0 })
  tierXp: number;

  @Column({ name: 'claimed_rewards', type: 'jsonb', default: [] })
  claimedRewards: Record<string, unknown>[];

  @Column({ name: 'payment_provider', length: 20, nullable: true })
  paymentProvider: string | null;

  @Column({ name: 'subscription_id', length: 200, nullable: true })
  subscriptionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
