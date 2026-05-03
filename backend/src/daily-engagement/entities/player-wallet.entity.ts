import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('player_wallets')
@Index(['playerId'], { unique: true })
export class PlayerWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid', unique: true })
  playerId: string;

  @Column({ name: 'resources', type: 'int', default: 0 })
  resources: number;

  @Column({ name: 'rare_shards', type: 'int', default: 0 })
  rareShards: number;

  @Column({ name: 'premium_currency', type: 'int', default: 0 })
  premiumCurrency: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
