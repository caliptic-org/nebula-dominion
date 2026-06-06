import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Partial index supporting the bulk-tick UPDATE in ResourcesService.applyTickBulk.
 *
 * The cron worker ticks every 30 s and now issues ONE statement of the form
 *
 *   UPDATE player_resources
 *   SET ...
 *   WHERE mineral_per_tick > 0 OR gas_per_tick > 0 OR energy_per_tick > 0
 *
 * Without an index this degrades to a seq-scan over the full table. Most rows
 * eventually qualify (any player who built a single production building has a
 * non-zero rate on at least one currency), so a regular B-tree on the rate
 * columns isn't selective enough — but the *complement set* (brand-new
 * accounts with zero production who haven't placed a building yet,
 * decommissioned/disabled accounts, alts) is small and shrinks the active
 * scan footprint meaningfully when the player base grows past a few thousand.
 *
 * A PARTIAL index gives us exactly that: the index covers only "active
 * producers", and the planner can use an index-only scan to pre-filter the
 * UPDATE target set before locking pages. This matters most under sustained
 * load when the tick runs concurrently with offline-accumulation reads from
 * logging-in players holding pessimistic_write locks on individual rows.
 *
 * IF NOT EXISTS keeps the migration idempotent — re-running on an env that
 * already has the index from a manual hot-fix is a no-op rather than an
 * error.
 *
 * Companion code: apps/game-server/src/resources/resources.service.ts
 *                 (ResourcesService.applyTickBulk)
 *                 apps/game-server/src/workers/resource-tick.worker.ts
 */
export class AddPlayerResourcesActiveIndex1779850000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_player_resources_active
      ON player_resources (player_id)
      WHERE mineral_per_tick > 0
         OR gas_per_tick > 0
         OR energy_per_tick > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_player_resources_active`);
  }
}
