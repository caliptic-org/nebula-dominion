import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('guild_contribution_daily')
@Index(['userId', 'day'], { unique: true })
@Index(['guildId', 'day'])
export class ContributionDaily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'date' })
  day: string;

  @Column({ name: 'donate_made', type: 'int', default: 0 })
  donateMade: number;

  @Column({ name: 'donate_received', type: 'int', default: 0 })
  donateReceived: number;

  @Column({ name: 'chat_message_count', type: 'int', default: 0 })
  chatMessageCount: number;

  @Column({ name: 'points', type: 'int', default: 0 })
  points: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
