import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ContentUnlock } from '../config/level-config';

@Entity('player_levels')
export class PlayerLevel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'current_age', type: 'int', default: 1 })
  currentAge: number;

  @Column({ name: 'current_level', type: 'int', default: 1 })
  currentLevel: number;

  @Column({ name: 'current_tier', type: 'int', default: 1 })
  currentTier: number;

  // XP within the current level (resets on level-up)
  @Column({ name: 'current_xp', type: 'int', default: 0 })
  currentXp: number;

  // Cumulative XP across all time
  @Column({ name: 'total_xp', type: 'int', default: 0 })
  totalXp: number;

  @Column({
    name: 'unlocked_content',
    type: 'text',
    array: true,
    default: '{}',
  })
  unlockedContent: ContentUnlock[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
