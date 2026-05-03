import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ResourceType {
  MINERAL = 'mineral',
  GAS = 'gas',
  ENERGY = 'energy',
  POPULATION = 'population',
}

@Entity('resource_configs')
export class ResourceConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_type', type: 'enum', enum: ResourceType, unique: true })
  resourceType: ResourceType;

  @Column({ name: 'base_rate_per_hour', type: 'int' })
  baseRatePerHour: number;

  @Column({ name: 'cap_base', type: 'int' })
  capBase: number;

  // Keys are age numbers (1-6), values are multipliers
  @Column({ name: 'cap_multipliers', type: 'jsonb' })
  capMultipliers: Record<string, number>;

  @Column({ name: 'building_exponent', type: 'decimal', precision: 4, scale: 2, default: 1.25 })
  buildingExponent: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
