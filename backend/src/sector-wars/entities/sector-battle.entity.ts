import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Sector } from './sector.entity';

export enum SectorBattleStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  ATTACKER_WON = 'attacker_won',
  DEFENDER_WON = 'defender_won',
  DRAW = 'draw',
}

@Entity('sector_battles')
@Index(['sectorId'])
@Index(['attackerAllianceId'])
@Index(['status'])
export class SectorBattle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sector_id', type: 'uuid' })
  sectorId: string;

  @Column({ name: 'attacker_alliance_id', type: 'uuid' })
  attackerAllianceId: string;

  @Column({ name: 'defender_alliance_id', type: 'uuid', nullable: true })
  defenderAllianceId: string | null;

  @Column({ name: 'attacker_player_id', type: 'uuid' })
  attackerPlayerId: string;

  @Column({ name: 'defender_player_id', type: 'uuid', nullable: true })
  defenderPlayerId: string | null;

  @Column({
    type: 'enum',
    enum: SectorBattleStatus,
    default: SectorBattleStatus.PENDING,
  })
  status: SectorBattleStatus;

  @Column({ name: 'attacker_score', type: 'int', default: 0 })
  attackerScore: number;

  @Column({ name: 'defender_score', type: 'int', default: 0 })
  defenderScore: number;

  @Column({ name: 'units_snapshot', type: 'jsonb', default: {} })
  unitsSnapshot: Record<string, unknown>;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Sector, (s) => s.battles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sector_id' })
  sector: Sector;
}
