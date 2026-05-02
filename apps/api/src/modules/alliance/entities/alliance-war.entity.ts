import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Alliance } from './alliance.entity';

export enum WarStatus {
  DECLARED = 'declared',
  ACTIVE = 'active',
  TRUCE = 'truce',
  ENDED = 'ended',
}

@Entity('alliance_wars')
export class AllianceWar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attacker_id' })
  attackerId: string;

  @ManyToOne(() => Alliance, (a) => a.warsAsAttacker)
  @JoinColumn({ name: 'attacker_id' })
  attacker: Alliance;

  @Column({ name: 'defender_id' })
  defenderId: string;

  @ManyToOne(() => Alliance, (a) => a.warsAsDefender)
  @JoinColumn({ name: 'defender_id' })
  defender: Alliance;

  @Column({ type: 'enum', enum: WarStatus, default: WarStatus.DECLARED })
  status: WarStatus;

  @Column({ name: 'attacker_score', type: 'int', default: 0 })
  attackerScore: number;

  @Column({ name: 'defender_score', type: 'int', default: 0 })
  defenderScore: number;

  @Column({ name: 'winner_id', nullable: true })
  winnerId: string | null;

  @Column({ name: 'declared_at', type: 'timestamptz', default: () => 'NOW()' })
  declaredAt: Date;

  @Column({ name: 'starts_at', type: 'timestamptz', default: () => "NOW() + INTERVAL '24 hours'" })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
