import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTierProgress1747500001000 implements MigrationInterface {
  name = 'CreateTierProgress1747500001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tier_progression" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "current_level" int NOT NULL DEFAULT 1,
        "current_age" int NOT NULL DEFAULT 1,
        "current_tier_name" varchar(64) NOT NULL DEFAULT 'Tohum',
        "xp" bigint NOT NULL DEFAULT 0,
        "xp_to_next_level" bigint NOT NULL DEFAULT 100,
        "achievements" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "tier_progression_user_id_uq"
      ON "tier_progression" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "tier_progression_user_id_uq"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tier_progression"`);
  }
}
