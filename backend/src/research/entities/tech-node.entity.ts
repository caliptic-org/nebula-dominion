import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ResearchCategory } from '../types/research.types';

@Entity('tech_nodes')
@Index(['race', 'category'])
@Index(['nodeKey'], { unique: true })
export class TechNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'node_key', type: 'varchar', length: 64, unique: true })
  nodeKey: string;

  @Column({ type: 'varchar', length: 64 })
  race: string;

  @Column({ type: 'enum', enum: ResearchCategory })
  category: ResearchCategory;

  @Column({ type: 'int' })
  tier: number;

  @Column({ name: 'row_position', type: 'int', default: 0 })
  rowPosition: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 16, default: '🔬' })
  icon: string;

  @Column({ name: 'effect_text', type: 'varchar', length: 255, default: '' })
  effectText: string;

  @Column({ name: 'cost_mineral', type: 'int', default: 0 })
  costMineral: number;

  @Column({ name: 'cost_gas', type: 'int', default: 0 })
  costGas: number;

  @Column({ name: 'duration_seconds', type: 'int', default: 60 })
  durationSeconds: number;

  @Column({ type: 'jsonb', default: [] })
  prerequisites: string[];

  @Column({ type: 'jsonb', default: {} })
  effects: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
