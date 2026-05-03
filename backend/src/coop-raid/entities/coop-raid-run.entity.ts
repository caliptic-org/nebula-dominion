import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum CoopRaidStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Entity('coop_raid_runs')
@Index(['guildId', 'weekKey'])
@Index(['status', 'expiresAt'])
export class CoopRaidRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'leader_id', type: 'uuid' })
  leaderId: string;

  @Column({ name: 'boss_hp_total', type: 'int' })
  bossHpTotal: number;

  @Column({ name: 'boss_hp_remaining', type: 'int' })
  bossHpRemaining: number;

  @Column({ type: 'enum', enum: CoopRaidStatus, default: CoopRaidStatus.OPEN })
  status: CoopRaidStatus;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'week_key', type: 'varchar', length: 16 })
  weekKey: string;
}
