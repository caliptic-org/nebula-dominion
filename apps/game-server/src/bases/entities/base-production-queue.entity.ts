import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * One in-flight (or just-completed) unit production order for a player's base.
 * The base is identified by the COMMAND_CENTER building's id, so a single
 * player ends up with one queue per main base. `startedAt`/`completesAt` are
 * persisted as absolute timestamps so the server is the source of truth for
 * timer state and clients only need to render a countdown against `Date.now()`.
 */
@Entity('base_production_queue')
@Index(['baseId', 'isComplete', 'position'])
@Index(['isComplete', 'completesAt'])
export class BaseProductionQueueEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id' })
  @Index()
  playerId: string;

  @Column({ name: 'base_id' })
  baseId: string;

  @Column({ name: 'unit_type', length: 64 })
  unitType: string;

  @Column({ name: 'unit_name', length: 64 })
  unitName: string;

  @Column({ name: 'unit_emoji', length: 16, default: '⚔️' })
  unitEmoji: string;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int' })
  position: number;

  @Column({ name: 'total_duration_seconds', type: 'int' })
  totalDurationSeconds: number;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'completes_at', type: 'timestamptz' })
  completesAt: Date;

  @Column({ name: 'is_complete', default: false })
  isComplete: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
