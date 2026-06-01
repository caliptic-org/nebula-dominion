import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('user_vip_spending')
@Unique(['userId'])
export class UserVipSpending {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    name: 'cumulative_spend_usd',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cumulativeSpendUsd: number;

  @Column({ name: 'vip_level', type: 'smallint', default: 0 })
  vipLevel: number;

  @Column({ name: 'last_upgraded_at', type: 'timestamptz', nullable: true })
  lastUpgradedAt: Date | null;

  /**
   * Last time the player claimed the once-per-day VIP reward (/shop daily
   * claim button).  20-hour cooldown enforced server-side in
   * VipService.claimDaily — see migration 1779820000000.  NULL = never
   * claimed; eligible immediately.
   */
  @Column({ name: 'last_daily_claim_at', type: 'timestamptz', nullable: true })
  lastDailyClaimAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
