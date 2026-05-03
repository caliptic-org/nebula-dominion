import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('xp_source_weights')
export class XpSourceWeight {
  @PrimaryColumn({ name: 'source_type', type: 'varchar', length: 32 })
  sourceType: string;

  @Column({ name: 'weight_pct', type: 'decimal', precision: 5, scale: 2 })
  weightPct: number;

  @Column({ name: 'unlocked_from_age', type: 'int', default: 1 })
  unlockedFromAge: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
