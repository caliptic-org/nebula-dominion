import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum InactiveAction {
  KICK_ELIGIBLE = 'kick_eligible',
  AUTO_KICKED = 'auto_kicked',
  GUILD_ARCHIVED = 'guild_archived',
}

@Entity('guild_inactive_marker')
@Index(['guildId', 'createdAt'])
@Index(['userId', 'action'])
export class GuildInactiveMarker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'enum', enum: InactiveAction })
  action: InactiveAction;

  @Column({ name: 'days_inactive', type: 'int' })
  daysInactive: number;

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
