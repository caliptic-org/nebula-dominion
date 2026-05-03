import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ChatReaction } from './chat-reaction.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({ name: 'channel_type', length: 20 })
  channelType: string;

  @Column({ type: 'varchar', name: 'channel_id', length: 100, nullable: true })
  channelId: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => ChatReaction, (r) => r.message, { cascade: true })
  reactions: ChatReaction[];
}
