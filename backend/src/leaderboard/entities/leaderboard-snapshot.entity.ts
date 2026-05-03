import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('leaderboard_snapshots')
@Index('idx_lb_snapshot_unique', ['userId', 'category', 'periodType', 'periodKey'], { unique: true })
@Index('idx_lb_snapshot_lookup', ['category', 'periodType', 'periodKey'])
export class LeaderboardSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ length: 20 })
  category: string;

  @Column({ name: 'period_type', length: 20 })
  periodType: string;

  @Column({ name: 'period_key', length: 50 })
  periodKey: string;

  @Column('int')
  rank: number;

  @Column({ type: 'bigint', default: 0 })
  score: number;

  @CreateDateColumn({ name: 'snapshot_at' })
  snapshotAt: Date;
}
