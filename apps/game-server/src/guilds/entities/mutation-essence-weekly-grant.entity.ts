import { Entity, PrimaryColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('mutation_essence_weekly_grants')
export class MutationEssenceWeeklyGrant {
  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Index()
  @PrimaryColumn({ name: 'iso_week_start', type: 'timestamptz' })
  isoWeekStart: Date;

  @Column({ name: 'granted_count', type: 'int', default: 0 })
  grantedCount: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
