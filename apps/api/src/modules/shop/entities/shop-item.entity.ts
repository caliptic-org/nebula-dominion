import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('shop_items')
export class ShopItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  sku: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: [
    'cosmetic_skin', 'cosmetic_banner', 'cosmetic_avatar_frame',
    'cosmetic_trail', 'cosmetic_chat_bubble', 'resource_pack',
    'unit_boost', 'premium_pass', 'battle_pass_tier_skip',
    'xp_booster', 'currency_bundle',
  ]})
  category: string;

  @Column({ length: 20, default: 'common' })
  rarity: string;

  @Column({ name: 'price_nebula_coins', type: 'int', nullable: true })
  priceNebulaCoins: number | null;

  @Column({ name: 'price_void_crystals', type: 'int', nullable: true })
  priceVoidCrystals: number | null;

  @Column({ name: 'price_premium_gems', type: 'int', nullable: true })
  pricePremiumGems: number | null;

  @Column({ name: 'price_real_usd', type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceRealUsd: number | null;

  @Column({ name: 'price_real_try', type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceRealTry: number | null;

  @Column({ type: 'jsonb', default: {} })
  content: Record<string, unknown>;

  @Column({ name: 'preview_asset', length: 500, nullable: true })
  previewAsset: string | null;

  @Column({ name: 'is_limited', default: false })
  isLimited: boolean;

  @Column({ name: 'limited_stock', type: 'int', nullable: true })
  limitedStock: number | null;

  @Column({ name: 'stock_remaining', type: 'int', nullable: true })
  stockRemaining: number | null;

  @Column({ name: 'available_from', type: 'timestamptz', nullable: true })
  availableFrom: Date | null;

  @Column({ name: 'available_until', type: 'timestamptz', nullable: true })
  availableUntil: Date | null;

  @Column({ name: 'age_required', type: 'int', nullable: true })
  ageRequired: number | null;

  @Column({ name: 'level_required', type: 'int', nullable: true })
  levelRequired: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
