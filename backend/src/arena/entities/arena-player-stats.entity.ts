import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('arena_player_stats')
@Index(['mmr'])
export class ArenaPlayerStats {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'int', default: 1000 })
  mmr: number;

  @Column({ name: 'arena_points', type: 'int', default: 0 })
  arenaPoints: number;

  @Column({ type: 'int', default: 0 })
  wins: number;

  @Column({ type: 'int', default: 0 })
  losses: number;

  @Column({ name: 'matches_today', type: 'int', default: 0 })
  matchesToday: number;

  @Column({ name: 'matches_today_day', type: 'date', nullable: true })
  matchesTodayDay: string | null;

  @Column({ name: 'last_match_at', type: 'timestamptz', nullable: true })
  lastMatchAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
