import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('subspace_zones')
export class SubspaceZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20 })
  tier: string;

  @Column({ name: 'level_required', type: 'int' })
  levelRequired: number;

  @Column({ type: 'int', default: 100 })
  capacity: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: {} })
  modifiers: Record<string, unknown>;

  @Column({ type: 'jsonb', default: [] })
  hazards: Record<string, unknown>[];

  @Column({ type: 'jsonb', default: {} })
  rewards: Record<string, unknown>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
