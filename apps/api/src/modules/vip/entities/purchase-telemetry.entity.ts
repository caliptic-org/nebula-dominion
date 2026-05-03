import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('purchase_telemetry')
export class PurchaseTelemetry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id' })
  playerId: string;

  @Column({ name: 'transaction_id', type: 'varchar', nullable: true })
  transactionId: string | null;

  @Column({
    name: 'purchase_amount_usd',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  purchaseAmountUsd: number | null;

  @Column({
    name: 'purchase_amount_try',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  purchaseAmountTry: number | null;

  @Column({ name: 'currency_code', type: 'char', length: 3, default: 'USD' })
  currencyCode: string;

  @Column({ name: 'purchase_type', length: 50 })
  purchaseType: string;

  @Column({ name: 'vip_level_at_purchase', type: 'smallint', default: 0 })
  vipLevelAtPurchase: number;

  @Column({ name: 'country_code', type: 'char', length: 2, nullable: true })
  countryCode: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
