import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { CosmeticItem } from './cosmetic-item.entity';

@Entity('user_cosmetics')
@Unique(['userId', 'cosmeticId'])
export class UserCosmetic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'cosmetic_id' })
  cosmeticId: string;

  @ManyToOne(() => CosmeticItem, (item) => item.userCosmetics, { eager: true })
  @JoinColumn({ name: 'cosmetic_id' })
  cosmeticItem: CosmeticItem;

  @Column({ name: 'is_equipped', default: false })
  isEquipped: boolean;

  @CreateDateColumn({ name: 'acquired_at' })
  acquiredAt: Date;
}
