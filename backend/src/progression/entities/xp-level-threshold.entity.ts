import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type TierBadge = 'acemi' | 'deneyimli' | 'sampiyon';

@Entity('xp_level_thresholds')
export class XpLevelThreshold {
  @PrimaryColumn({ type: 'int' })
  level: number;

  @Column({ type: 'int' })
  age: number;

  @Column({ name: 'cumulative_xp', type: 'bigint' })
  cumulativeXp: number;

  @Column({ name: 'xp_for_level', type: 'int' })
  xpForLevel: number;

  @Column({ name: 'tier_badge', type: 'varchar', length: 16 })
  tierBadge: TierBadge;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
