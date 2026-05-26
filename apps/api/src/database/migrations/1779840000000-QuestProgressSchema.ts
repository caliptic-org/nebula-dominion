import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `quest_progress` table for the QuestProgressModule.
 *
 * Schema:
 *   - Composite primary key on (user_id, quest_id) so the canonical
 *     `INSERT ... ON CONFLICT (user_id, quest_id) DO UPDATE ...` upsert in
 *     QuestProgressService.incrementProgress() is a single round-trip with
 *     no read-then-write race.
 *   - `current_progress` is an int with default 0 — quest counters are
 *     unsigned whole numbers (battles_won, buildings_built, etc).
 *   - Index on `user_id` so the "all quests for one user" lookup
 *     (`GET /api/v1/quest-progress/:userId`) doesn't seq scan.
 *
 * The DDL is idempotent via `IF NOT EXISTS` so dev environments that
 * already have the table from a `synchronize: true` boot won't fail
 * on first run.
 */
export class QuestProgressSchema1779840000000 implements MigrationInterface {
  name = 'QuestProgressSchema1779840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.quest_progress (
        user_id          varchar      NOT NULL,
        quest_id         varchar(80)  NOT NULL,
        current_progress integer      NOT NULL DEFAULT 0,
        created_at       timestamptz  NOT NULL DEFAULT NOW(),
        updated_at       timestamptz  NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_quest_progress PRIMARY KEY (user_id, quest_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_quest_progress_user
        ON public.quest_progress (user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_quest_progress_user;`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.quest_progress;`);
  }
}
