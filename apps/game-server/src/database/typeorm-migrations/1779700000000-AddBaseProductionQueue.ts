import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the per-base unit production queue table.
 *
 * Each row is one queued (or just-completed) unit order tied to a base
 * (= COMMAND_CENTER building id). `started_at` / `completes_at` are absolute
 * timestamps so the server owns timer state; clients render a countdown
 * by diffing against now.
 *
 * Idempotent: every CREATE uses IF NOT EXISTS so re-running the migration
 * after a partial failure is safe.
 */
export class AddBaseProductionQueue1779700000000 implements MigrationInterface {
  name = 'AddBaseProductionQueue1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS base_production_queue (
        id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id                UUID         NOT NULL,
        base_id                  UUID         NOT NULL,
        unit_type                VARCHAR(64)  NOT NULL,
        unit_name                VARCHAR(64)  NOT NULL,
        unit_emoji               VARCHAR(16)  NOT NULL DEFAULT '⚔️',
        level                    INTEGER      NOT NULL DEFAULT 1,
        position                 INTEGER      NOT NULL,
        total_duration_seconds   INTEGER      NOT NULL,
        started_at               TIMESTAMPTZ  NOT NULL,
        completes_at             TIMESTAMPTZ  NOT NULL,
        is_complete              BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_base_production_queue_player ON base_production_queue (player_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_base_production_queue_base_pending ON base_production_queue (base_id, is_complete, position)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_base_production_queue_due ON base_production_queue (is_complete, completes_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_base_production_queue_due`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_base_production_queue_base_pending`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_base_production_queue_player`);
    await queryRunner.query(`DROP TABLE IF EXISTS base_production_queue`);
  }
}
