import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bumps the resource defaults from 100/50/100 → 500/200/250 so new players
 * can actually afford their first 4 buildings. Also tops up existing
 * accounts that are still sitting below the new floor — anyone who logged
 * in under the old defaults and hasn't yet earned past them gets enough
 * to escape the chicken-and-egg trap (no resources → no buildings → no
 * production → no resources).
 *
 * Idempotent: GREATEST keeps anyone already above the floor untouched.
 */
export class BumpStarterResources1779655000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Schema defaults — new accounts pick these up automatically.
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "mineral" SET DEFAULT 500`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "gas" SET DEFAULT 200`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "energy" SET DEFAULT 250`,
    );

    // Existing rows — bump anyone below the floor to the floor. GREATEST
    // ensures a player who's already earned past the floor isn't reduced.
    await queryRunner.query(
      `UPDATE "resources" SET "mineral" = GREATEST("mineral", 500) WHERE "mineral" < 500`,
    );
    await queryRunner.query(
      `UPDATE "resources" SET "gas" = GREATEST("gas", 200) WHERE "gas" < 200`,
    );
    await queryRunner.query(
      `UPDATE "resources" SET "energy" = GREATEST("energy", 250) WHERE "energy" < 250`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert schema defaults to the original values.
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "mineral" SET DEFAULT 100`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "gas" SET DEFAULT 50`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "energy" SET DEFAULT 100`,
    );
    // Existing rows stay where they are — no data destruction on revert.
  }
}
