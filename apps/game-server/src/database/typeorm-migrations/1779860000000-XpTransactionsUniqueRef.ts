import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit fix S4 + F4-econ: prevent unlimited XP via
 * `POST /api/progression/award-xp`.
 *
 * Pre-fix history:
 *   - The endpoint was JWT-only with an ownership check
 *     (`dto.userId === currentUserId`) — letting any player POST
 *     `{ userId: <self>, source: 'PVP_VICTORY' }` against themselves.
 *   - `referenceId` was `@IsOptional` in AwardXpDto.
 *   - The earlier migration `1779840000000-AddXpTransactionsUnique`
 *     added a PARTIAL unique index (`WHERE reference_id IS NOT NULL`),
 *     deliberately leaving non-idempotent grants — PvP win, training
 *     completion — outside the constraint. That note has aged badly:
 *     it's exactly those `reference_id = NULL` grants that the bug
 *     report flagged as unlimited.
 *
 * This migration tightens the model:
 *   1. Drop the partial index (it's superseded).
 *   2. Add a proper UNIQUE CONSTRAINT
 *      `uq_xp_tx_user_source_ref (user_id, source, reference_id)`,
 *      which the entity now declares via @Unique() and the
 *      ProgressionService catches as 23505 → graceful no-op.
 *
 * Postgres treats NULL as DISTINCT for UNIQUE by default — legacy
 * pre-fix rows with reference_id IS NULL coexist freely and don't
 * block this DDL. Going forward, AwardXpDto.referenceId is REQUIRED
 * (MinLength 1, MaxLength 255) so every NEW row carries a non-null
 * value that the constraint enforces uniqueness on.
 *
 * Down: reverse — drop the named constraint, restore the partial index.
 * That way reverting this migration leaves the database in the same
 * state the 1779840000000 migration intended.
 */
export class XpTransactionsUniqueRef1779860000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove the partial index — superseded.
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_xp_transactions_user_source_reference_unique`,
    );

    // 2. Add the full UNIQUE constraint.  IF NOT EXISTS isn't valid
    //    SQL for ADD CONSTRAINT, so we guard via the catalog instead.
    //    Defensive — running this twice (e.g. on a partially-migrated
    //    dev DB) shouldn't fail.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_xp_tx_user_source_ref'
        ) THEN
          ALTER TABLE xp_transactions
            ADD CONSTRAINT uq_xp_tx_user_source_ref
            UNIQUE (user_id, source, reference_id);
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE xp_transactions
      DROP CONSTRAINT IF EXISTS uq_xp_tx_user_source_ref
    `);
    // Restore the partial index that the prior migration created so the
    // DB state matches what the 1779840000000 migration left.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_user_source_reference_unique
         ON xp_transactions (user_id, source, reference_id)
         WHERE reference_id IS NOT NULL`,
    );
  }
}
