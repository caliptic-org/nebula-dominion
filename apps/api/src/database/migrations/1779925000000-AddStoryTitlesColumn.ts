import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit cycle 6 — STORY-COMPLETE-NO-ORDER-GATE.
 *
 * Adds a `titles` text[] column to `story_progress` so the canonical
 * gated `completeChapter()` path has somewhere to persist the
 * `reward.titleUnlock` granted by a chapter (e.g. "Çağ 1 Kahramanı"
 * from ch_04, "Çağ 2 Fatihi" from ch_09).
 *
 * Before this audit cycle, `chapter.reward.titleUnlock` was returned to
 * the client in the HTTP response of POST /story/.../complete/:chapterId
 * but NEVER persisted — so the unlock was effectively lost on the next
 * page load. Combined with the missing order/level gate (a new account
 * could POST `ch_22_finale` and skip straight to the final chapter),
 * this gave any authenticated user the ability to mint titles without
 * actually earning them.
 *
 * The new column is a Postgres text[] (matches the existing
 * `completed_chapters` column shape). New rows default to '{}', and
 * `completeChapter()` appends `chapter.reward.titleUnlock` inside the
 * pessimistic-write transaction that also writes `completed_chapters`,
 * so the two arrays stay in sync atomically.
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS guards against a re-run on dev
 * DBs where `synchronize: true` already added the column.
 */
export class AddStoryTitlesColumn1779925000000 implements MigrationInterface {
  name = 'AddStoryTitlesColumn1779925000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.story_progress
        ADD COLUMN IF NOT EXISTS titles text[] NOT NULL DEFAULT '{}'::text[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.story_progress
        DROP COLUMN IF EXISTS titles
    `);
  }
}
