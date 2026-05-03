import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'flag_key', type: 'varchar', length: 128, unique: true })
  flagKey: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  value: Record<string, unknown>;

  // Keyed by segment name: { whale: {...}, f2p: {...}, new_user: {...} }
  @Column({ name: 'segment_overrides', type: 'jsonb', default: {} })
  segmentOverrides: Record<string, Record<string, unknown>>;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
