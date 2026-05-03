import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('event_participants')
export class EventParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event, (e) => e.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
