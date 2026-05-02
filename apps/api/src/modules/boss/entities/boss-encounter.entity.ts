import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Age } from '../../age5-content/entities/age.entity';

@Entity('boss_encounters')
export class BossEncounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'int', default: 1 })
  phase: number;

  @Column({ name: 'age_id' })
  ageId: string;

  @ManyToOne(() => Age)
  @JoinColumn({ name: 'age_id' })
  age: Age;

  @Column({ name: 'level_required', type: 'int' })
  levelRequired: number;

  @Column({ type: 'bigint' })
  hp: string;

  @Column({ type: 'int' })
  attack: number;

  @Column({ type: 'int' })
  defense: number;

  @Column({ type: 'int' })
  speed: number;

  @Column({ type: 'jsonb', default: [] })
  mechanics: Record<string, unknown>[];

  @Column({ type: 'jsonb', default: [] })
  phases: Record<string, unknown>[];

  @Column({ type: 'jsonb', default: [] })
  weaknesses: Record<string, unknown>[];

  @Column({ type: 'jsonb', default: [] })
  resistances: Record<string, unknown>[];

  @Column({ type: 'jsonb', default: {} })
  rewards: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  lore: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
