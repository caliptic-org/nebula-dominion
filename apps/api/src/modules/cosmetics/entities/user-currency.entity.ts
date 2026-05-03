import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('user_currency')
export class UserCurrency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'nebula_coins', type: 'int', default: 0 })
  nebulaCoins: number;

  @Column({ name: 'void_crystals', type: 'int', default: 0 })
  voidCrystals: number;

  @Column({ name: 'premium_gems', type: 'int', default: 0 })
  premiumGems: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
