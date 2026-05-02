import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ShopItem } from './shop-item.entity';

@Entity('user_inventory')
@Unique(['userId', 'shopItemId'])
export class UserInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'shop_item_id' })
  shopItemId: string;

  @ManyToOne(() => ShopItem)
  @JoinColumn({ name: 'shop_item_id' })
  shopItem: ShopItem;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'acquired_at', type: 'timestamptz', default: () => 'NOW()' })
  acquiredAt: Date;

  @Column({ length: 30, default: 'purchase' })
  source: string;

  @Column({ name: 'is_equipped', default: false })
  isEquipped: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
