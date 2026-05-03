import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('event_rules')
export class EventRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event, (e) => e.rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ length: 10, default: '📋' })
  icon: string;

  @Column({ length: 100 })
  title: string;

  @Column({ type: 'text', name: 'description' })
  description: string;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;
}
