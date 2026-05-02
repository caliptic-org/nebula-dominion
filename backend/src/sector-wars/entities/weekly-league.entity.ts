import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { LeagueParticipant } from './league-participant.entity';

export enum LeagueTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

@Entity('weekly_leagues')
@Index(['isActive'])
@Index(['seasonNumber'])
export class WeeklyLeague {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'season_number', type: 'int' })
  seasonNumber: number;

  @Column({ type: 'enum', enum: LeagueTier, default: LeagueTier.BRONZE })
  tier: LeagueTier;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'prize_description', type: 'text', nullable: true })
  prizeDescription: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => LeagueParticipant, (lp) => lp.league)
  participants: LeagueParticipant[];
}
