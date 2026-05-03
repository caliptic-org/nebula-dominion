import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EventRule } from './event-rule.entity';
import { EventReward } from './event-reward.entity';
import { EventParticipant } from './event-participant.entity';

export enum EventType {
  TOURNAMENT = 'tournament',
  RESOURCE = 'resource',
  GUILD = 'guild',
  SPECIAL = 'special',
}

export enum EventStatus {
  ACTIVE = 'active',
  UPCOMING = 'upcoming',
  ARCHIVE = 'archive',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 300, nullable: true })
  subtitle: string;

  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.UPCOMING })
  status: EventStatus;

  @Column({ name: 'race_color', length: 20, default: '#ffffff' })
  raceColor: string;

  @Column({ name: 'race_gradient', type: 'text', default: 'linear-gradient(135deg, #0a0a12 0%, #07090f 100%)' })
  raceGradient: string;

  @Column({ name: 'race_label', length: 50, default: '' })
  raceLabel: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate: Date;

  @Column({ name: 'max_participants', nullable: true, type: 'int' })
  maxParticipants: number;

  @Column({ name: 'top_prize', length: 200, default: '' })
  topPrize: string;

  @Column({ default: false })
  featured: boolean;

  @OneToMany(() => EventRule, (r) => r.event, { cascade: true })
  rules: EventRule[];

  @OneToMany(() => EventReward, (r) => r.event, { cascade: true })
  rewards: EventReward[];

  @OneToMany(() => EventParticipant, (p) => p.event, { cascade: true })
  participants: EventParticipant[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
