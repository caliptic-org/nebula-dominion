import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'transaction_type' })
  transactionType: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  provider: string | null;

  @Column({ name: 'shop_item_id', type: 'varchar', nullable: true })
  shopItemId: string | null;

  @Column({ name: 'premium_pass_id', type: 'varchar', nullable: true })
  premiumPassId: string | null;

  // ── Fulfillment anchors (audit cycle 6 — BLOCKER PAYMENT-COMPLETETX-NO-FULFILLMENT)
  //
  // The create-intent path now snapshots `dto.itemSku` / `dto.passCode`
  // into these columns so the post-webhook completeTransaction can look
  // up shop_items.content / premium_passes.rewards and credit the
  // player's wallet + inventory.  Prior to this the columns didn't
  // exist and the only fulfillment was the VIP cumulative-spend bump —
  // the player never received the gems / items they paid for.
  //
  // Catalog-drift safe: once the row is written, a later edit to
  // shop_items pricing or content doesn't change what gets delivered —
  // the webhook reads `quantity` + the *_delta columns (or re-reads
  // shop_items.content keyed by the snapshotted SKU, which is fine if
  // content is treated as immutable per SKU).  See migration
  // 1779910000000-AddTransactionFulfillmentFields.
  @Column({ name: 'item_sku', type: 'varchar', length: 100, nullable: true })
  itemSku: string | null;

  @Column({ name: 'pass_code', type: 'varchar', length: 50, nullable: true })
  passCode: string | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'amount_usd', type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountUsd: number | null;

  @Column({ name: 'amount_try', type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountTry: number | null;

  @Column({ name: 'currency_code', type: 'char', length: 3, default: 'USD' })
  currencyCode: string;

  @Column({ name: 'nebula_coins_delta', type: 'int', default: 0 })
  nebulaCoinsDelta: number;

  @Column({ name: 'void_crystals_delta', type: 'int', default: 0 })
  voidCrystalsDelta: number;

  @Column({ name: 'premium_gems_delta', type: 'int', default: 0 })
  premiumGemsDelta: number;

  @Column({ name: 'provider_payment_id', type: 'varchar', length: 300, nullable: true, unique: true })
  providerPaymentId: string | null;

  @Column({ name: 'provider_order_id', type: 'varchar', length: 300, nullable: true })
  providerOrderId: string | null;

  @Column({ name: 'provider_response', type: 'jsonb', nullable: true })
  providerResponse: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'country_code', type: 'char', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt: Date | null;

  @Column({ name: 'refund_reason', type: 'text', nullable: true })
  refundReason: string | null;

  @Column({ name: 'parent_transaction_id', type: 'varchar', nullable: true })
  parentTransactionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
