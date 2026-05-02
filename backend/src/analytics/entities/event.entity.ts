import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('analytics_events')
@Index(['event_type', 'server_ts'])
@Index(['user_id', 'server_ts'])
@Index(['session_id'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 128 })
  event_type: string;

  @Column({ type: 'varchar', length: 255 })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  session_id: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  race: string | null;

  @Column({ type: 'smallint', nullable: true })
  tier_age: number | null;

  @Column({ type: 'smallint', nullable: true })
  tier_level: number | null;

  @Column({ type: 'smallint', nullable: true })
  vip_level: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  device: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  app_version: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  client_ts: Date | null;

  @Column({ type: 'jsonb', default: {} })
  properties: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  server_ts: Date;
}
