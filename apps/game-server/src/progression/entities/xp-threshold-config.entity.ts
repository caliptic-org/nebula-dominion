import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('xp_threshold_config')
export class XpThresholdConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source', type: 'varchar', length: 64, unique: true })
  source: string;

  @Column({ name: 'base_amount', type: 'int' })
  baseAmount: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
