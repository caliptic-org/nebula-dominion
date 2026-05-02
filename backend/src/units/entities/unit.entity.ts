import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UnitRace } from '../types/units.types';

@Entity('units')
@Index(['playerId'])
@Index(['playerId', 'isActive'])
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: UnitRace })
  race: UnitRace;

  @Column({ name: 'tier_level', type: 'int', default: 1 })
  tierLevel: number;

  @Column({ type: 'int', default: 10 })
  attack: number;

  @Column({ type: 'int', default: 5 })
  defense: number;

  @Column({ type: 'int', default: 100 })
  hp: number;

  @Column({ name: 'max_hp', type: 'int', default: 100 })
  maxHp: number;

  @Column({ type: 'int', default: 10 })
  speed: number;

  @Column({ type: 'jsonb', default: [] })
  abilities: string[];

  @Column({ name: 'merge_count', type: 'int', default: 0 })
  mergeCount: number;

  @Column({ name: 'parent_unit_ids', type: 'jsonb', default: [] })
  parentUnitIds: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
