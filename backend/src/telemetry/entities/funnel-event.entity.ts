import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('funnel_events')
@Index(['userId', 'eventName', 'occurredAt'])
export class FunnelEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Index()
  @Column({ name: 'event_name', length: 100 })
  eventName: string;

  @Column({ type: 'jsonb', default: {} })
  properties: Record<string, unknown>;

  @Column({ nullable: true, length: 50 })
  platform: string | null;

  @Column({ nullable: true, length: 100 })
  device: string | null;

  @Column({ nullable: true, length: 50 })
  race: string | null;

  @Column({ nullable: true, type: 'int' })
  era: number | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
