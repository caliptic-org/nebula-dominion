import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ChatChannel {
  GLOBAL = 'global',
  GUILD = 'guild',
}

export enum ChatMessageType {
  PLAYER = 'player',
  SYSTEM = 'system',
  BATTLE = 'battle',
  GUILD = 'guild',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ChatChannel })
  @Index()
  channel: ChatChannel;

  @Column({ name: 'channel_id', length: 100, nullable: true })
  channelId: string | null;

  @Column({ name: 'author_id' })
  @Index()
  authorId: string;

  @Column({ length: 20, nullable: true })
  race: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: ChatMessageType, default: ChatMessageType.PLAYER })
  type: ChatMessageType;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
