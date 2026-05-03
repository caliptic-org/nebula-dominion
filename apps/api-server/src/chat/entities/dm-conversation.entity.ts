import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('dm_conversations')
@Unique(['user1Id', 'user2Id'])
export class DmConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user1_id' })
  @Index()
  user1Id: string;

  @Column({ name: 'user2_id' })
  @Index()
  user2Id: string;

  @Column({ name: 'last_message', type: 'text', nullable: true })
  lastMessage: string | null;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @Column({ name: 'user1_unread', default: 0 })
  user1Unread: number;

  @Column({ name: 'user2_unread', default: 0 })
  user2Unread: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
