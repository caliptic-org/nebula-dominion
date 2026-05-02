import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Age } from './age.entity';

@Entity('levels')
export class Level {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'age_id' })
  ageId: string;

  @ManyToOne(() => Age, (age) => age.levels)
  @JoinColumn({ name: 'age_id' })
  age: Age;

  @Column({ type: 'int', unique: true })
  number: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'xp_required', type: 'int' })
  xpRequired: number;

  @Column({ type: 'jsonb', default: {} })
  rewards: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  unlocks: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
