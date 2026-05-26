import { Entity, PrimaryColumn, Column, UpdateDateColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * Per-user counter for a single quest identifier.
 *
 * Composite primary key on (userId, questId) so the canonical upsert
 * `INSERT ... ON CONFLICT (user_id, quest_id) DO UPDATE SET current_progress = ...`
 * is a single round-trip with no read-then-write race.
 *
 * `questId` is the symbolic name shared with the missions catalog stub
 * (e.g. 'battles_won', 'buildings_built'). It is intentionally a free-form
 * string and NOT a foreign key — the catalog is currently a static seed
 * and the canonical DailyEngagement module is still on the way, so we don't
 * want a hard reference that would block iterating on the catalog.
 */
@Entity('quest_progress')
@Index('idx_quest_progress_user', ['userId'])
export class QuestProgress {
  @PrimaryColumn({ name: 'user_id', type: 'varchar' })
  userId: string;

  @PrimaryColumn({ name: 'quest_id', type: 'varchar', length: 80 })
  questId: string;

  @Column({ name: 'current_progress', type: 'int', default: 0 })
  currentProgress: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
