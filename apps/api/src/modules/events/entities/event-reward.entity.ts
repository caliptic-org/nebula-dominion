import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('event_rewards')
export class EventReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event, (e) => e.rewards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'int' })
  rank: number;

  @Column({ length: 200 })
  prize: string;

  @Column({ name: 'prize_detail', length: 300, nullable: true })
  prizeDetail: string;

  @Column({ name: 'badge_type', length: 50, nullable: true })
  badgeType: string;
}
