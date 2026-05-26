import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `mission_claims` for the canonical DailyEngagementModule.
 *
 * One row per (userId, missionId). The UNIQUE constraint is what makes
 * POST /daily-engagement/claim idempotent — without it a re-tap on
 * "Ödülü Al" would double-credit the wallet. The check is enforced at
 * the DB level so concurrent POSTs in the same JS tick still collapse
 * to a single insert.
 *
 * `mission_type` is a plain varchar instead of a Postgres enum so we can
 * add new mission categories (raid, seasonal, …) later without a
 * follow-up enum migration. Validation lives in the DTO.
 *
 * Idempotent: `CREATE TABLE IF NOT EXISTS` guards against a re-run when
 * synchronize had already created the table on a dev DB.
 */
export class AddMissionClaims1779830000000 implements MigrationInterface {
  name = 'AddMissionClaims1779830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.mission_claims (
        id uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
        user_id varchar(255) NOT NULL,
        mission_id varchar(100) NOT NULL,
        mission_type varchar(20) NOT NULL,
        claimed_at timestamptz NOT NULL DEFAULT now(),
        reward_json jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "UQ_mission_claims_user_mission" UNIQUE (user_id, mission_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mission_claims_user_id"
        ON public.mission_claims (user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.mission_claims`);
  }
}
