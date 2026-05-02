import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum Race {
  HUMAN = 'human',
  ZERG = 'zerg',
  HYBRID = 'hybrid',
}

@Entity('unit_types')
@Index(['race', 'ageNumber', 'tierLevel'], { unique: true })
@Index(['code'], { unique: true })
export class UnitType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ name: 'name_tr', type: 'varchar', length: 128 })
  nameTr: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: Race })
  race: Race;

  @Column({ name: 'age_number', type: 'int' })
  ageNumber: number;

  @Column({ name: 'tier_level', type: 'int' })
  tierLevel: number;

  @Column({ name: 'global_tier', type: 'int' })
  globalTier: number;

  // Base stats
  @Column({ name: 'base_hp', type: 'int' })
  baseHp: number;

  @Column({ name: 'base_attack', type: 'int' })
  baseAttack: number;

  @Column({ name: 'base_defense', type: 'int' })
  baseDefense: number;

  @Column({ name: 'base_speed', type: 'int' })
  baseSpeed: number;

  // Training cost
  @Column({ name: 'mineral_cost', type: 'int' })
  mineralCost: number;

  @Column({ name: 'energy_cost', type: 'int' })
  energyCost: number;

  @Column({ name: 'population_cost', type: 'int', default: 1 })
  populationCost: number;

  // Training duration in seconds
  @Column({ name: 'training_time_seconds', type: 'int' })
  trainingTimeSeconds: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
