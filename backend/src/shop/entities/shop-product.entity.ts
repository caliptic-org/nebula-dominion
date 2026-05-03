import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ShopCategory, ProductTag } from '../types/shop.types';

@Entity('shop_products')
@Index(['category'])
@Index(['raceExclusive'])
@Index(['isActive'])
export class ShopProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 64 })
  icon: string;

  @Column({ type: 'enum', enum: ShopCategory })
  category: ShopCategory;

  @Column({ name: 'gem_price', type: 'int', nullable: true })
  gemPrice: number | null;

  @Column({ name: 'gold_price', type: 'int', nullable: true })
  goldPrice: number | null;

  @Column({ name: 'original_gem_price', type: 'int', nullable: true })
  originalGemPrice: number | null;

  @Column({ name: 'original_gold_price', type: 'int', nullable: true })
  originalGoldPrice: number | null;

  @Column({ type: 'int', nullable: true })
  discount: number | null;

  @Column({ type: 'int', nullable: true })
  stock: number | null;

  @Column({ type: 'enum', enum: ProductTag, nullable: true })
  tag: ProductTag | null;

  @Column({ name: 'race_exclusive', type: 'varchar', length: 64, nullable: true })
  raceExclusive: string | null;

  @Column({ name: 'bundle_contents', type: 'jsonb', default: '[]' })
  bundleContents: string[];

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
