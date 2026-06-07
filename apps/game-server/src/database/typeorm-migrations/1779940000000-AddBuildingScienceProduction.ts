import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cycle 17 BAL-02 — science decoupled from PvP-only sourcing.
 *
 * Adds the `science_per_tick` production-rate column to player_resources.
 *
 * Context: science was previously sourced ONLY from PvP battle rewards +
 * garrisoned galaxy nodes, yet every Lv5+ building upgrade charges science
 * (targetLevel × cost). That silently coupled all mid-game BASE progression
 * to the map/PvP subsystem. The fix adds a passive science trickle from
 * research-flavoured labs (academy / cyber_core / hatchery, sciencePerTick
 * in BUILDING_CONFIGS). recalculateProductionRates now sums that trickle
 * and persists it here via ResourcesService.updateRates; applyTickBulk /
 * applyTick / applyOfflineAccumulation accrue it into the science wallet
 * (capped at science_cap) exactly like mineral/gas/energy per-tick.
 *
 * Companion entity field: Resource.sciencePerTick (resource.entity.ts).
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS is safe to re-run. Uses
 * numeric(20,4) to match the sibling per-tick columns widened in
 * 1779800000000-ExpandResourceCapacity (Lv54 multi-building stacks must
 * not overflow). NOTE: no gen_random_uuid()/uuid_generate_v4() is needed
 * here — this migration only adds a column, it creates no rows. (The
 * cycle-16 deploy fix that mandated gen_random_uuid() over
 * uuid_generate_v4() applies to migrations that CREATE TABLE / DEFAULT a
 * UUID; called out for the next agent's benefit.)
 */
export class AddBuildingScienceProduction1779940000000 implements MigrationInterface {
  name = 'AddBuildingScienceProduction1779940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "player_resources"
        ADD COLUMN IF NOT EXISTS "science_per_tick" NUMERIC(20,4) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "player_resources" DROP COLUMN IF EXISTS "science_per_tick"
    `);
  }
}
