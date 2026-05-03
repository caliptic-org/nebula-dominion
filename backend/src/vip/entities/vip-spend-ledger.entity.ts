import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('vip_spend_ledger')
export class VipSpendLedger {
  @PrimaryColumn({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'cumulative_spend_cents', type: 'int', default: 0 })
  cumulativeSpendCents: number;

  @Column({ name: 'current_vip_level', type: 'int', default: 0 })
  currentVipLevel: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
