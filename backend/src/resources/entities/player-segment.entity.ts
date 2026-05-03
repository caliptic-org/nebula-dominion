import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type PlayerSegmentName = 'whale' | 'f2p' | 'new_user' | 'mid_spender';

@Entity('player_segments')
export class PlayerSegment {
  @PrimaryColumn({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ type: 'varchar', length: 32, default: 'f2p' })
  segment: PlayerSegmentName;

  @Column({ name: 'account_age_days', type: 'int', default: 0 })
  accountAgeDays: number;

  @Column({ name: 'cumulative_spend_cents', type: 'int', default: 0 })
  cumulativeSpendCents: number;

  @Column({ name: 'vip_level', type: 'int', default: 0 })
  vipLevel: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
