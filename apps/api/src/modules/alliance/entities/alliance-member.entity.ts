import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Alliance } from './alliance.entity';

export enum AllianceRole {
  LEADER = 'leader',
  OFFICER = 'officer',
  VETERAN = 'veteran',
  MEMBER = 'member',
  RECRUIT = 'recruit',
}

@Entity('alliance_members')
export class AllianceMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'alliance_id' })
  allianceId: string;

  @ManyToOne(() => Alliance, (a) => a.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alliance_id' })
  alliance: Alliance;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: AllianceRole, default: AllianceRole.RECRUIT })
  role: AllianceRole;

  @Column({ type: 'int', default: 0 })
  contribution: number;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
