import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type GuildEventType =
  | 'join'
  | 'leave'
  | 'donate_request'
  | 'donate_send'
  | 'donate_received'
  | 'raid_attend'
  | 'chat_message'
  | 'research_contrib'
  | 'mute'
  | 'report';

@Entity('guild_events')
@Index(['guildId', 'createdAt'])
@Index(['userId', 'eventType', 'createdAt'])
export class GuildEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType: GuildEventType;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
