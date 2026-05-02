import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { WeeklyLeague } from './weekly-league.entity';

@Entity('league_participants')
@Unique(['leagueId', 'playerId'])
@Index(['leagueId', 'score'])
export class LeagueParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'league_id', type: 'uuid' })
  leagueId: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', nullable: true })
  rank: number | null;

  @Column({ name: 'battles_won', type: 'int', default: 0 })
  battlesWon: number;

  @Column({ name: 'battles_lost', type: 'int', default: 0 })
  battlesLost: number;

  @Column({ name: 'sector_captures', type: 'int', default: 0 })
  sectorCaptures: number;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @ManyToOne(() => WeeklyLeague, (l) => l.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'league_id' })
  league: WeeklyLeague;
}
