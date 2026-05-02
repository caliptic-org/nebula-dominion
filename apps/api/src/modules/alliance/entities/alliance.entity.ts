import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { AllianceMember } from './alliance-member.entity';
import { AllianceStorage } from './alliance-storage.entity';
import { AllianceWar } from './alliance-war.entity';

@Entity('alliances')
export class Alliance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ length: 10, unique: true })
  tag: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'leader_id' })
  leaderId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  emblem: string | null;

  @Column({ type: 'smallint', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ name: 'max_members', type: 'int', default: 20 })
  maxMembers: number;

  @Column({ name: 'is_open', default: true })
  isOpen: boolean;

  @Column({ name: 'min_elo', type: 'int', default: 0 })
  minElo: number;

  @Column({ name: 'war_wins', type: 'int', default: 0 })
  warWins: number;

  @Column({ name: 'war_losses', type: 'int', default: 0 })
  warLosses: number;

  @OneToMany(() => AllianceMember, (m) => m.alliance)
  members: AllianceMember[];

  @OneToOne(() => AllianceStorage, (s) => s.alliance)
  storage: AllianceStorage;

  @OneToMany(() => AllianceWar, (w) => w.attacker)
  warsAsAttacker: AllianceWar[];

  @OneToMany(() => AllianceWar, (w) => w.defender)
  warsAsDefender: AllianceWar[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
