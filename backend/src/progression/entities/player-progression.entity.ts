import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { TierBadge } from './xp-level-threshold.entity';

@Entity('player_progression')
export class PlayerProgression {
  @PrimaryColumn({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'current_level', type: 'int', default: 1 })
  currentLevel: number;

  @Column({ name: 'current_age', type: 'int', default: 1 })
  currentAge: number;

  @Column({ name: 'total_xp', type: 'bigint', default: 0 })
  totalXp: number;

  @Column({ name: 'tier_badge', type: 'varchar', length: 16, default: 'acemi' })
  tierBadge: TierBadge;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
