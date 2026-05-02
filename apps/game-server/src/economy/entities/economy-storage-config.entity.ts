import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ResourceType = 'mineral' | 'gas' | 'energy' | 'population';

@Entity('economy_storage_configs')
export class EconomyStorageConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'resource_type', type: 'varchar', length: 20 })
  resourceType: ResourceType;

  @Column({ name: 'base_cap', type: 'integer' })
  baseCap: number;

  /** Six multipliers, one per age (index 0 = Age 1 … index 5 = Age 6) */
  @Column({ name: 'age_multipliers', type: 'numeric', array: true })
  ageMultipliers: number[];

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
