import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BossEncounter } from './boss-encounter.entity';

@Entity('boss_encounter_attempts')
export class BossAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'boss_encounter_id' })
  bossEncounterId: string;

  @ManyToOne(() => BossEncounter)
  @JoinColumn({ name: 'boss_encounter_id' })
  bossEncounter: BossEncounter;

  @Column({ length: 20, default: 'in_progress' })
  status: string;

  @Column({ name: 'current_phase', type: 'int', default: 1 })
  currentPhase: number;

  @Column({ name: 'boss_hp_remaining', type: 'bigint', nullable: true })
  bossHpRemaining: string | null;

  @Column({ name: 'units_deployed', type: 'jsonb', default: [] })
  unitsDeployed: Record<string, unknown>[];

  @Column({ name: 'units_lost', type: 'jsonb', default: [] })
  unitsLost: Record<string, unknown>[];

  @Column({ name: 'damage_dealt', type: 'bigint', default: 0 })
  damageDealt: string;

  @Column({ name: 'damage_taken', type: 'bigint', default: 0 })
  damageTaken: string;

  @Column({ name: 'mechanics_triggered', type: 'jsonb', default: [] })
  mechanicsTriggered: Record<string, unknown>[];

  @Column({ name: 'rewards_earned', type: 'jsonb', nullable: true })
  rewardsEarned: Record<string, unknown> | null;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'NOW()' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'duration_secs', type: 'int', nullable: true })
  durationSecs: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
