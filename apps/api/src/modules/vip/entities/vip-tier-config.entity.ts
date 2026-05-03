import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export interface VipBenefits {
  daily_nebula_coins: number;
  extra_queue_slots: number;
  cosmetics: string[];
  perks: string[];
}

@Entity('vip_tier_config')
@Unique(['vipLevel'])
export class VipTierConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vip_level', type: 'smallint' })
  vipLevel: number;

  @Column({
    name: 'min_spend_usd',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  minSpendUsd: number;

  @Column({ length: 50 })
  label: string;

  @Column({ type: 'jsonb', default: '{}' })
  benefits: VipBenefits;

  @Column({ name: 'feature_flag', type: 'varchar', length: 100, nullable: true })
  featureFlag: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
