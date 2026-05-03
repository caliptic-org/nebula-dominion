import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('user_vip_spending')
@Unique(['userId'])
export class UserVipSpending {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    name: 'cumulative_spend_usd',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cumulativeSpendUsd: number;

  @Column({ name: 'vip_level', type: 'smallint', default: 0 })
  vipLevel: number;

  @Column({ name: 'last_upgraded_at', type: 'timestamptz', nullable: true })
  lastUpgradedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
