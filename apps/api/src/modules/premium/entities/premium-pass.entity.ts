import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('premium_passes')
export class PremiumPass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'pass_type', length: 30 })
  passType: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number;

  @Column({ name: 'price_usd', type: 'decimal', precision: 10, scale: 2 })
  priceUsd: number;

  @Column({ name: 'price_try', type: 'decimal', precision: 10, scale: 2 })
  priceTry: number;

  @Column({ type: 'jsonb', default: [] })
  features: string[];

  @Column({ type: 'jsonb', default: {} })
  rewards: Record<string, unknown>;

  @Column({ name: 'tier_rewards', type: 'jsonb', default: [] })
  tierRewards: Record<string, unknown>[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
