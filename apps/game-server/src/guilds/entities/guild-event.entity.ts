import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum GuildEventType {
  JOIN = 'join',
  LEAVE = 'leave',
  DONATE = 'donate',
  RAID_ATTEND = 'raid_attend',
  CHAT_MESSAGE = 'chat_message',
  RESEARCH_CONTRIB = 'research_contrib',
}

@Entity('guild_events')
export class GuildEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'enum', enum: GuildEventType })
  type: GuildEventType;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
