import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ResearchStatus } from '../types/research.types';
import { TechNode } from './tech-node.entity';

@Entity('player_research')
@Index(['playerId'])
@Index(['playerId', 'status'])
@Index(['playerId', 'nodeId'], { unique: true })
export class PlayerResearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'node_id', type: 'uuid' })
  nodeId: string;

  @Column({
    type: 'enum',
    enum: ResearchStatus,
    default: ResearchStatus.ACTIVE,
  })
  status: ResearchStatus;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'estimated_completion_at', type: 'timestamptz' })
  estimatedCompletionAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => TechNode, { eager: true })
  @JoinColumn({ name: 'node_id' })
  node: TechNode;
}
