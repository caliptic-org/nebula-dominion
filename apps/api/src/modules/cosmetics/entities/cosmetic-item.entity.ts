import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CosmeticCategory = 'skin' | 'frame' | 'title' | 'effect';
export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

@Entity('cosmetic_items')
export class CosmeticItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'enum', enum: ['skin', 'frame', 'title', 'effect'] })
  category: CosmeticCategory;

  @Column({ type: 'enum', enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' })
  rarity: CosmeticRarity;

  @Column({ name: 'price_gems', type: 'int', nullable: true })
  priceGems: number | null;

  @Column({ length: 50 })
  icon: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ name: 'preview_image', length: 500, nullable: true })
  previewImage: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
