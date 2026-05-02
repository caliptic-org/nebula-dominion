import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Age } from './age.entity';

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'age_id' })
  ageId: string;

  @ManyToOne(() => Age)
  @JoinColumn({ name: 'age_id' })
  age: Age;

  @Column({ name: 'level_unlock', type: 'int' })
  levelUnlock: number;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 30 })
  race: string;

  @Column({ name: 'unit_type', length: 30 })
  unitType: string;

  @Column({ type: 'int' })
  tier: number;

  @Column({ type: 'int' })
  attack: number;

  @Column({ type: 'int' })
  defense: number;

  @Column({ type: 'int' })
  speed: number;

  @Column({ type: 'int' })
  hp: number;

  @Column({ name: 'energy_cost', type: 'int' })
  energyCost: number;

  @Column({ name: 'mineral_cost', type: 'int' })
  mineralCost: number;

  @Column({ name: 'special_ability', type: 'jsonb', default: {} })
  specialAbility: Record<string, unknown>;

  @Column({ name: 'subspace_bonus', type: 'jsonb', default: {} })
  subspaceBonus: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
