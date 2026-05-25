import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `level` column to `player_units` so unit upgrades have a
 * persistent tier marker. Existing rows default to 1 (unupgraded).
 *
 * Stats themselves (hp/attack/defense/speed) stay in their existing
 * columns and get +10% per upgrade applied at write time — the level
 * is just the UI-visible tier badge so combat doesn't have to re-derive
 * scaling on every read.
 */
export class AddPlayerUnitLevel1779650000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "player_units" ADD COLUMN IF NOT EXISTS "level" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "player_units" DROP COLUMN IF EXISTS "level"`);
  }
}
