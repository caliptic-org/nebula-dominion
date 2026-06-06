import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hardens the boss-encounter-attempt flow against the E2 client-trust
 * exploit. Companion to apps/api/src/modules/boss/boss.service.ts.
 *
 * Adds two pieces of schema:
 *
 *   1. `boss_encounter_attempts.last_attack_at` — wall-clock timestamp
 *      of the most recent `attackBoss()` call. The service rejects
 *      calls arriving within ATTACK_COOLDOWN_MS (500ms) with HTTP 429,
 *      defanging rapid-fire damage drains.
 *
 *   2. `boss_attempt_credits` table + partial unique index on
 *      (attempt_id) WHERE kind = 'victory_credit'. The service INSERTs
 *      one row at victory time; ON CONFLICT DO NOTHING ensures a
 *      concurrent kill-shot race produces at most one credit row. Any
 *      future wallet-credit hook (rewards_earned → user balance) can
 *      attach here and inherit one-shot semantics for free.
 *
 * Nullable last_attack_at means existing in-progress attempts at
 * deploy time skip the cooldown gate on their next attack — acceptable
 * because the gate kicks in from the *second* attack onward anyway.
 */
export class AddBossAttemptHardening1779880000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "boss_encounter_attempts" ADD COLUMN IF NOT EXISTS "last_attack_at" TIMESTAMP WITH TIME ZONE NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "boss_attempt_credits" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "attempt_id"  UUID NOT NULL REFERENCES "boss_encounter_attempts"("id") ON DELETE CASCADE,
        "kind"        VARCHAR(40) NOT NULL,
        "awarded_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_boss_attempt_credits_victory"
        ON "boss_attempt_credits" ("attempt_id")
        WHERE "kind" = 'victory_credit'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_boss_attempt_credits_attempt"
        ON "boss_attempt_credits" ("attempt_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_boss_attempt_credits_attempt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_boss_attempt_credits_victory"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "boss_attempt_credits"`);
    await queryRunner.query(
      `ALTER TABLE "boss_encounter_attempts" DROP COLUMN IF EXISTS "last_attack_at"`,
    );
  }
}
