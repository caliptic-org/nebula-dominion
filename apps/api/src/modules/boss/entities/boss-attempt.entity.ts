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

  /**
   * Wall-clock timestamp of the most recent attackBoss() call accepted
   * for this attempt. Used to enforce a per-attempt cooldown (see
   * `ATTACK_COOLDOWN_MS` in boss.service.ts) — a second attack arriving
   * before `lastAttackAt + cooldown` is rejected with 429.
   *
   * Nullable: a fresh attempt with no attacks yet has no last-attack
   * timestamp, and the cooldown gate passes through on null.
   */
  @Column({ name: 'last_attack_at', type: 'timestamptz', nullable: true })
  lastAttackAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'duration_secs', type: 'int', nullable: true })
  durationSecs: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
