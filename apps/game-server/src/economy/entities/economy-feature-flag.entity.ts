import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('economy_feature_flags')
export class EconomyFeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'flag_key', type: 'varchar', length: 100 })
  flagKey: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  /** A/B variant identifier; 'control' = default behaviour */
  @Column({ type: 'varchar', length: 50, default: 'control' })
  variant: string;

  /** Arbitrary JSON payload for flag-specific parameters */
  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
