import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { XpSource } from '../config/level-config';

// Audit fix (S4 + F4-econ): UNIQUE(user_id, source, reference_id)
// closes the unlimited-XP loop. Per-grant referenceId is now required
// by the DTO; the DB constraint is the second line of defense so any
// retry / replay / forged client request collides on insert and is
// caught by the service's 23505 handler. Postgres treats NULL as
// distinct for UNIQUE — legacy rows with NULL reference_id (pre-fix)
// won't collide and won't block this migration.
@Entity('xp_transactions')
@Index(['userId', 'createdAt'])
@Unique('uq_xp_tx_user_source_ref', ['userId', 'source', 'referenceId'])
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
