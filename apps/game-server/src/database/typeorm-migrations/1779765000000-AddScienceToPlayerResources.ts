import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds science and science_cap columns to player_resources.
 *
 * Both columns exist in the Resource entity and are queried by
 * ResourcesService.getSnapshot() / getOrCreate(), but were never included
 * in the initial migration, causing a PostgreSQL "column does not exist"
 * error on every GET /api/buildings/resources request.
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS is safe to re-run.
 */
export class AddScienceToPlayerResources1779765000000 implements MigrationInterface {
  name = 'AddScienceToPlayerResources1779765000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "player_resources"
        ADD COLUMN IF NOT EXISTS "science"     NUMERIC(12,4) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "science_cap" INTEGER       NOT NULL DEFAULT 999999
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "player_resources" DROP COLUMN IF EXISTS "science_cap"`);
    await queryRunner.query(`ALTER TABLE "player_resources" DROP COLUMN IF EXISTS "science"`);
  }
}
