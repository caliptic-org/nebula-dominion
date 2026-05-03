import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SubspaceZone } from './subspace-zone.entity';

@Entity('subspace_battles')
export class SubspaceBattle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'zone_id' })
  zoneId: string;

  @ManyToOne(() => SubspaceZone)
  @JoinColumn({ name: 'zone_id' })
  zone: SubspaceZone;

  @Column({ name: 'battle_type', length: 30 })
  battleType: string;

  @Column({ name: 'attacker_id' })
  attackerId: string;

  @Column({ name: 'defender_id', type: 'varchar', nullable: true })
  defenderId: string | null;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'attacker_units', type: 'jsonb', default: [] })
  attackerUnits: Record<string, unknown>[];

  @Column({ name: 'defender_units', type: 'jsonb', default: [] })
  defenderUnits: Record<string, unknown>[];

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown> | null;

  @Column({ name: 'winner_id', type: 'varchar', nullable: true })
  winnerId: string | null;

  @Column({ name: 'subspace_effects', type: 'jsonb', default: [] })
  subspaceEffects: Record<string, unknown>[];

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
