import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('economy_building_configs')
export class EconomyBuildingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'building_type', type: 'varchar', length: 50 })
  buildingType: string;

  @Column({ name: 'base_mineral_per_hour', type: 'numeric', precision: 10, scale: 4, default: 0 })
  baseMineralPerHour: number;

  @Column({ name: 'base_gas_per_hour', type: 'numeric', precision: 10, scale: 4, default: 0 })
  baseGasPerHour: number;

  @Column({ name: 'base_energy_per_hour', type: 'numeric', precision: 10, scale: 4, default: 0 })
  baseEnergyPerHour: number;

  @Column({ name: 'base_population_per_hour', type: 'numeric', precision: 10, scale: 4, default: 0 })
  basePopulationPerHour: number;

  /** Flat hourly energy drain — does NOT scale with building level */
  @Column({ name: 'energy_consumption_per_hour', type: 'numeric', precision: 10, scale: 4, default: 0 })
  energyConsumptionPerHour: number;

  /** production = base * exponent^(level-1) */
  @Column({ name: 'level_scale_exponent', type: 'numeric', precision: 6, scale: 4, default: 1.25 })
  levelScaleExponent: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
