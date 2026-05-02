import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BattleStatus } from '../types/battle.types';
import { BattleLog } from './battle-log.entity';

@Entity('battles')
@Index(['attackerId'])
@Index(['defenderId'])
@Index(['status'])
export class Battle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attacker_id', type: 'uuid' })
  attackerId: string;

  @Column({ name: 'defender_id', type: 'uuid' })
  defenderId: string;

  @Column({
    type: 'enum',
    enum: BattleStatus,
    default: BattleStatus.PENDING,
  })
  status: BattleStatus;

  @Column({ name: 'winner_id', type: 'uuid', nullable: true })
  winnerId: string | null;

  @Column({ name: 'attacker_army', type: 'jsonb' })
  attackerArmy: object;

  @Column({ name: 'defender_army', type: 'jsonb' })
  defenderArmy: object;

  @Column({ name: 'current_turn', type: 'int', default: 0 })
  currentTurn: number;

  @Column({ name: 'current_turn_side', type: 'varchar', default: 'attacker' })
  currentTurnSide: string;

  @Column({ name: 'attacker_army_state', type: 'jsonb', nullable: true })
  attackerArmyState: object | null;

  @Column({ name: 'defender_army_state', type: 'jsonb', nullable: true })
  defenderArmyState: object | null;

  @Column({ name: 'is_bot_opponent', type: 'boolean', default: false })
  isBotOpponent: boolean;

  @Column({ name: 'replay_key', type: 'varchar', nullable: true })
  replayKey: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => BattleLog, (log) => log.battle)
  logs: BattleLog[];
}
