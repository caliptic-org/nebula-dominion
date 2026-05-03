import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { StreakReward } from '../types/daily-engagement.types';

@Entity('login_streaks')
@Index(['playerId'], { unique: true })
export class LoginStreak {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid', unique: true })
  playerId: string;

  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', type: 'int', default: 0 })
  longestStreak: number;

  // stored as 'YYYY-MM-DD' string; null = never logged in
  @Column({ name: 'last_login_date', type: 'date', nullable: true })
  lastLoginDate: string | null;

  @Column({ name: 'streak_start_date', type: 'date', nullable: true })
  streakStartDate: string | null;

  // whether grace period was consumed in the current streak cycle
  @Column({ name: 'grace_period_used', type: 'boolean', default: false })
  gracePeriodUsed: boolean;

  @Column({ name: 'pending_rewards', type: 'jsonb', default: [] })
  pendingRewards: StreakReward[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
