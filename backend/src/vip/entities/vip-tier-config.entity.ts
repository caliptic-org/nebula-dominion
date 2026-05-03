import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('vip_tier_configs')
export class VipTierConfig {
  @PrimaryColumn({ name: 'vip_level', type: 'int' })
  vipLevel: number;

  @Column({ name: 'threshold_cents', type: 'int' })
  thresholdCents: number;

  // Non-combat benefits only: queue_slots, daily_login_bonus_pct, cosmetic_slot
  @Column({ type: 'jsonb', default: {} })
  benefits: Record<string, unknown>;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
