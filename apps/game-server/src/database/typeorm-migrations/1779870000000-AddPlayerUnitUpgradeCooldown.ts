import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `upgrade_completed_at` column to `player_units` so the
 * /units/:id/upgrade endpoint can enforce a per-unit cooldown between
 * sequential level bumps.
 *
 * Before this column existed the upgrade endpoint had zero resource
 * cost and no rate-limit — a player could fire 9 sequential POSTs and
 * reach level 10 (max stats) within a single request burst. The
 * service-layer fix (units.service.ts upgradeUnit) writes a future
 * timestamp here whose duration scales with the unit's current level
 * (60 * 2^level seconds, divided by GAME_SPEED_MULTIPLIER). Any
 * subsequent upgrade attempt before this deadline returns 400.
 *
 * Nullable so historical rows (never-upgraded units) leave it null and
 * the cooldown gate skips them on the first call. The service writes a
 * concrete timestamp from the first upgrade onward.
 */
export class AddPlayerUnitUpgradeCooldown1779870000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "player_units" ADD COLUMN IF NOT EXISTS "upgrade_completed_at" TIMESTAMP WITH TIME ZONE NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "player_units" DROP COLUMN IF EXISTS "upgrade_completed_at"`,
    );
  }
}
