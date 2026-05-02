import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Level } from './level.entity';

@Entity('ages')
export class Age {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unique: true })
  number: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  theme: string;

  @Column({ name: 'level_min', type: 'int' })
  levelMin: number;

  @Column({ name: 'level_max', type: 'int' })
  levelMax: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @Column({ name: 'unlocked_at', type: 'timestamptz', nullable: true })
  unlockedAt: Date | null;

  @OneToMany(() => Level, (level) => level.age)
  levels: Level[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
