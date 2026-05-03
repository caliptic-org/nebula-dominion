import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('arena_matches')
@Index(['winnerId', 'createdAt'])
@Index(['loserId', 'createdAt'])
@Index(['weekKey', 'createdAt'])
export class ArenaMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'winner_id', type: 'uuid' })
  winnerId: string;

  @Column({ name: 'loser_id', type: 'uuid' })
  loserId: string;

  @Column({ name: 'winner_mmr_before', type: 'int' })
  winnerMmrBefore: number;

  @Column({ name: 'loser_mmr_before', type: 'int' })
  loserMmrBefore: number;

  @Column({ name: 'winner_mmr_delta', type: 'int' })
  winnerMmrDelta: number;

  @Column({ name: 'loser_mmr_delta', type: 'int' })
  loserMmrDelta: number;

  @Column({ name: 'winner_gem_reward', type: 'int', default: 50 })
  winnerGemReward: number;

  @Column({ name: 'loser_gem_reward', type: 'int', default: 10 })
  loserGemReward: number;

  @Column({ name: 'week_key', type: 'varchar', length: 16 })
  weekKey: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
