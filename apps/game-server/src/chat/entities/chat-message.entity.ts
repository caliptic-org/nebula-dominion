import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ChannelType {
  GLOBAL = 'global',
  ALLIANCE = 'alliance',
  PRIVATE = 'private',
  SYSTEM = 'system',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_id' })
  @Index()
  senderId: string;

  @Column({ name: 'channel_type', type: 'enum', enum: ChannelType })
  @Index()
  channelType: ChannelType;

  @Column({ type: 'varchar', name: 'channel_id', length: 100, nullable: true })
  channelId: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
