import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SubspaceZone } from './subspace-zone.entity';

@Entity('subspace_sessions')
export class SubspaceSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'zone_id' })
  zoneId: string;

  @ManyToOne(() => SubspaceZone)
  @JoinColumn({ name: 'zone_id' })
  zone: SubspaceZone;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'entered_at', type: 'timestamptz', default: () => 'NOW()' })
  enteredAt: Date;

  @Column({ name: 'exited_at', type: 'timestamptz', nullable: true })
  exitedAt: Date | null;

  @Column({ name: 'duration_secs', type: 'int', nullable: true })
  durationSecs: number | null;

  @Column({ name: 'units_deployed', type: 'jsonb', default: [] })
  unitsDeployed: Record<string, unknown>[];

  @Column({ name: 'hazards_hit', type: 'jsonb', default: [] })
  hazardsHit: Record<string, unknown>[];

  @Column({ name: 'rewards_earned', type: 'jsonb', default: {} })
  rewardsEarned: Record<string, unknown>;

  @Column({ name: 'enemies_killed', type: 'int', default: 0 })
  enemiesKilled: number;

  @Column({ name: 'boss_defeated', default: false })
  bossDefeated: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
