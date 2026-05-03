import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('player_wallets')
@Index(['playerId'], { unique: true })
export class PlayerWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid', unique: true })
  playerId: string;

  @Column({ type: 'int', default: 0 })
  gem: number;

  @Column({ type: 'int', default: 0 })
  gold: number;

  @Column({ name: 'version', type: 'int', default: 0 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
