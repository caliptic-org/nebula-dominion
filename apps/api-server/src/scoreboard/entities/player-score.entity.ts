import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('player_scores')
export class PlayerScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 30 })
  username: string;

  @Column({ name: 'display_name', length: 50, nullable: true })
  displayName: string;

  @Index()
  @Column({ name: 'total_score', default: 0 })
  totalScore: number;

  @Column({ name: 'battles_won', default: 0 })
  battlesWon: number;

  @Column({ name: 'battles_lost', default: 0 })
  battlesLost: number;

  @Column({ name: 'elo_rating', default: 1200 })
  eloRating: number;

  @Column({ name: 'win_streak', default: 0 })
  winStreak: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
