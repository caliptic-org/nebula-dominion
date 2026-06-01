import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a `count` column to `training_queue` so a single row represents an
 * atomic batch order ("Marine ×5") instead of forcing the frontend to POST
 * /units/train 5 times.  Backend deducts cost × count, schedules the row's
 * completesAt = now + (duration × count), and on completion spawns `count`
 * units in one go.  Default 1 so all pre-migration rows still represent a
 * single-unit order — no data backfill needed.
 *
 * Down-migration drops the column.  Existing data with count > 1 would lose
 * the batch info on rollback but the rows themselves stay valid (treated as
 * single-unit again).
 */
export class AddTrainingQueueCount1779810000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE training_queue
        ADD COLUMN IF NOT EXISTS count INTEGER NOT NULL DEFAULT 1
    `);
    // Guard against absurd batch sizes — keep the column honest at the DB
    // layer too so a malicious client bypassing the DTO can't queue 10^6
    // units in one POST.  Matches the frontend's max=99 stepper.
    await queryRunner.query(`
      ALTER TABLE training_queue
        ADD CONSTRAINT training_queue_count_range
          CHECK (count BETWEEN 1 AND 99)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE training_queue
        DROP CONSTRAINT IF EXISTS training_queue_count_range
    `);
    await queryRunner.query(`
      ALTER TABLE training_queue
        DROP COLUMN IF EXISTS count
    `);
  }
}
