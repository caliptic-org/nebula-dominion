import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('login_streaks')
export class LoginStreak {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', type: 'int', default: 0 })
  longestStreak: number;

  /** UTC date string YYYY-MM-DD of the last day the streak was claimed */
  @Column({ name: 'last_claimed_date', type: 'varchar', length: 10, nullable: true })
  lastClaimedDate: string | null;

  @Column({ name: 'rescue_tokens', type: 'int', default: 0 })
  rescueTokens: number;

  @Column({ name: 'weekly_rescue_granted_at', type: 'timestamptz', nullable: true })
  weeklyRescueGrantedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
