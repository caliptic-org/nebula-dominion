import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { UnitRace } from '../types/units.types';

@Entity('mutation_rules')
@Index(['sourceRace1', 'sourceRace2'])
export class MutationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_race_1', type: 'enum', enum: UnitRace })
  sourceRace1: UnitRace;

  @Column({ name: 'source_race_2', type: 'enum', enum: UnitRace })
  sourceRace2: UnitRace;

  @Column({ name: 'min_tier_level', type: 'int', default: 1 })
  minTierLevel: number;

  @Column({ name: 'result_race', type: 'enum', enum: UnitRace })
  resultRace: UnitRace;

  @Column({ name: 'result_name_template', type: 'varchar', length: 255 })
  resultNameTemplate: string;

  @Column({ name: 'attack_multiplier', type: 'decimal', precision: 4, scale: 2, default: 1.0 })
  attackMultiplier: number;

  @Column({ name: 'defense_multiplier', type: 'decimal', precision: 4, scale: 2, default: 1.0 })
  defenseMultiplier: number;

  @Column({ name: 'hp_multiplier', type: 'decimal', precision: 4, scale: 2, default: 1.0 })
  hpMultiplier: number;

  @Column({ name: 'speed_multiplier', type: 'decimal', precision: 4, scale: 2, default: 1.0 })
  speedMultiplier: number;

  @Column({ name: 'bonus_abilities', type: 'jsonb', default: [] })
  bonusAbilities: string[];

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
