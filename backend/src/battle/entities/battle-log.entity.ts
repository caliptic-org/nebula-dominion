import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BattleActionType } from '../types/battle.types';
import { Battle } from './battle.entity';

@Entity('battle_logs')
@Index(['battleId'])
@Index(['battleId', 'turnNumber'])
export class BattleLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'battle_id', type: 'uuid' })
  battleId: string;

  @Column({ name: 'turn_number', type: 'int' })
  turnNumber: number;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: BattleActionType,
    default: BattleActionType.ATTACK,
  })
  actionType: BattleActionType;

  @Column({ name: 'actor_player_id', type: 'uuid' })
  actorPlayerId: string;

  @Column({ name: 'actor_unit_id', type: 'uuid' })
  actorUnitId: string;

  @Column({ name: 'actor_unit_name', type: 'varchar' })
  actorUnitName: string;

  @Column({ name: 'target_unit_id', type: 'uuid', nullable: true })
  targetUnitId: string | null;

  @Column({ name: 'target_unit_name', type: 'varchar', nullable: true })
  targetUnitName: string | null;

  @Column({ name: 'base_damage', type: 'int', default: 0 })
  baseDamage: number;

  @Column({ name: 'final_damage', type: 'int', default: 0 })
  finalDamage: number;

  @Column({ name: 'critical_hit', type: 'boolean', default: false })
  criticalHit: boolean;

  @Column({ name: 'blocked_damage', type: 'int', default: 0 })
  blockedDamage: number;

  @Column({ name: 'target_remaining_hp', type: 'int', default: 0 })
  targetRemainingHp: number;

  @Column({ name: 'unit_killed', type: 'boolean', default: false })
  unitKilled: boolean;

  @Column({ name: 'attacker_army_state', type: 'jsonb' })
  attackerArmyState: object;

  @Column({ name: 'defender_army_state', type: 'jsonb' })
  defenderArmyState: object;

  // Hash of (battleId + turnNumber + action + result) for anti-cheat integrity verification
  @Column({ name: 'state_hash', type: 'varchar', length: 64 })
  stateHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Battle, (battle) => battle.logs)
  @JoinColumn({ name: 'battle_id' })
  battle: Battle;
}
