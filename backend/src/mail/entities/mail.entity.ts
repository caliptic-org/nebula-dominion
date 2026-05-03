import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MailType {
  SYSTEM = 'system',
  BATTLE_REPORT = 'battle_report',
  GUILD = 'guild',
  EVENT = 'event',
}

export interface MailReward {
  type: string;
  label: string;
  amount: number;
  icon: string;
}

@Entity('mails')
@Index(['userId', 'deletedAt'])
@Index(['userId', 'type'])
@Index(['userId', 'isRead'])
export class Mail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: MailType })
  type: MailType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 255 })
  sender: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'sent_at', type: 'timestamptz', default: () => 'NOW()' })
  sentAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  rewards: MailReward[] | null;

  @Column({ name: 'rewards_claimed', type: 'boolean', default: false })
  rewardsClaimed: boolean;

  @Column({ name: 'rewards_claimed_at', type: 'timestamptz', nullable: true })
  rewardsClaimedAt: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
