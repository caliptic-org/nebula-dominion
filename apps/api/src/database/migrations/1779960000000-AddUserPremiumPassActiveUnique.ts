import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FLOW-001 pt.4 — foreclose the concurrent-enroll duplicate race on
 * user_premium_passes.
 *
 * premium.service.ensureBattlePassEnrollment lazily creates a free-track
 * UserPremiumPass on first battle. Two concurrent first-battles for the same
 * user could both miss the existing+dup checks and insert two active rows for
 * the same (user_id, premium_pass_id). It's benign for gameplay (addBattlePassXp's
 * findOne picks one; the orphan is a fresh tier-0 row, never granted/claimed)
 * but a data-integrity gap. A partial UNIQUE index makes the second concurrent
 * insert fail fast.
 *
 * The api runs migrationsRun on boot, so a failing migration crash-loops it.
 * A bare unique-index add would fail if any active dup already exists — so we
 * DEDUP FIRST: keep the single most-progressed active row per
 * (user_id, premium_pass_id) and 'cancel' the rest (a status the live schema +
 * getUserActivePasses already treat as inactive), THEN create the index
 * (IF NOT EXISTS → idempotent / safe to replay).
 */
export class AddUserPremiumPassActiveUnique1779960000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Among active rows sharing (user_id, premium_pass_id), keep the single
    // most-progressed one (current_tier, then tier_xp, then newest, then id —
    // a total order since id is a unique PK) and cancel the others, so the
    // partial unique index below applies with zero violations.
    await queryRunner.query(`
      UPDATE user_premium_passes t
         SET status = 'cancelled'
       WHERE t.status = 'active'
         AND EXISTS (
           SELECT 1 FROM user_premium_passes o
            WHERE o.user_id = t.user_id
              AND o.premium_pass_id = t.premium_pass_id
              AND o.status = 'active'
              AND o.id <> t.id
              AND (o.current_tier, o.tier_xp, o.created_at, o.id)
                > (t.current_tier, t.tier_xp, t.created_at, t.id)
         )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_user_premium_pass_active
        ON user_premium_passes (user_id, premium_pass_id)
        WHERE status = 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_user_premium_pass_active`);
  }
}
