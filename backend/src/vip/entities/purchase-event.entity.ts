import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('purchase_events')
export class PurchaseEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'purchase_type', type: 'varchar', length: 64 })
  purchaseType: string;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ name: 'vip_level_at_purchase', type: 'int', default: 0 })
  vipLevelAtPurchase: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
