import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a UNIQUE constraint on `xp_transactions(user_id, source, reference_id)`
 * so one-shot XP grants (tutorial completion, achievement milestones, etc.)
 * become idempotent at the database level.
 *
 * Motivation: tutorial.controller.ts previously tracked redemption in a
 * module-scope `Set<userId>`. Container restart wiped the Set and every
 * already-redeemed player could re-claim the +500 mineral / +25 energy /
 * +200 XP starter gift. The fix is to make the persisted xp_transaction
 * itself the source of truth: insert with a fixed referenceId
 * ('tutorial_complete_v1') and let Postgres reject duplicates.
 *
 * NULL-safety: existing rows from the old code path used referenceId
 * 'tutorial_complete' (no _v1 suffix), or NULL for other XP sources. The
 * constraint below uses a partial unique index that ignores NULL
 * reference_id rows — XP earned from training/combat/etc. doesn't use
 * referenceId for idempotency and shouldn't be constrained.
 *
 * Coordination: if a sibling B1 patch lands the same constraint, drop
 * this migration and update the xp-transaction.entity.ts @Index to match
 * whatever B1 names. As of this commit no such file exists under
 * apps/game-server/src/database/typeorm-migrations/.
 */
export class AddXpTransactionsUnique1779840000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Partial unique: only rows WITH a reference_id are constrained.
    // This is intentional — non-idempotent XP grants (PvP win, training
    // completion) intentionally don't pass referenceId and should be
    // allowed to insert freely.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_user_source_reference_unique
         ON xp_transactions (user_id, source, reference_id)
         WHERE reference_id IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_xp_transactions_user_source_reference_unique`,
    );
  }
}
