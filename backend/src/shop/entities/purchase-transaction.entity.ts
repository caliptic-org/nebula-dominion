import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Currency, PurchaseStatus } from '../types/shop.types';

@Entity('purchase_transactions')
@Index(['playerId', 'createdAt'])
@Index(['idempotencyKey'], { unique: true })
@Index(['status'])
export class PurchaseTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, unique: true })
  idempotencyKey: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'enum', enum: PurchaseStatus, default: PurchaseStatus.PENDING })
  status: PurchaseStatus;

  @Column({ name: 'gem_balance_after', type: 'int', nullable: true })
  gemBalanceAfter: number | null;

  @Column({ name: 'gold_balance_after', type: 'int', nullable: true })
  goldBalanceAfter: number | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
