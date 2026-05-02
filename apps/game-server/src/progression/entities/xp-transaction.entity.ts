import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { XpSource } from '../config/level-config';

@Entity('xp_transactions')
@Index(['userId', 'createdAt'])
export class XpTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'source', type: 'varchar', length: 64 })
  source: XpSource;

  @Column({ name: 'base_amount', type: 'int' })
  baseAmount: number;

  @Column({ name: 'multiplier', type: 'numeric', precision: 4, scale: 2 })
  multiplier: number;

  @Column({ name: 'final_amount', type: 'int' })
  finalAmount: number;

  @Column({ name: 'level_before', type: 'int' })
  levelBefore: number;

  @Column({ name: 'level_after', type: 'int' })
  levelAfter: number;

  @Column({ name: 'reference_id', type: 'varchar', length: 255, nullable: true })
  referenceId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
