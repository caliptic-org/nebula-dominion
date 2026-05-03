import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ReportStatus {
  OPEN = 'open',
  REVIEWED = 'reviewed',
  ACTIONED = 'actioned',
  DISMISSED = 'dismissed',
}

@Entity('guild_reports')
@Index(['guildId', 'status'])
export class GuildReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId: string;

  @Column({ name: 'target_user_id', type: 'uuid' })
  targetUserId: string;

  @Column({ name: 'message_id', type: 'uuid', nullable: true })
  messageId: string | null;

  @Column({ type: 'varchar', length: 500 })
  reason: string;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.OPEN })
  status: ReportStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
