import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensures player_buildings table exists with the correct schema.
 *
 * Background: the initial TypeORM migration (1714723200000) originally created
 * a table called "buildings". Commit 6699141 renamed both the entity
 * (@Entity('player_buildings')) and the migration file to use "player_buildings".
 * However, in production the migration was already recorded in typeorm_migrations
 * as run, so TypeORM never re-ran it — leaving only the old "buildings" table and
 * never creating "player_buildings". Every query from the Building entity therefore
 * fails with "relation player_buildings does not exist".
 *
 * This migration fixes the issue by:
 *   1. Ensuring the buildings_type_enum and buildings_status_enum exist.
 *   2. If "buildings" exists but "player_buildings" does not → rename the table
 *      and migrate its enum columns to use the new type names.
 *   3. If "player_buildings" does not exist (from either path) → create it fresh.
 *   4. Add any columns that may be missing from a pre-TypeORM schema version.
 *
 * Fully idempotent: safe to run multiple times.
 */
export class EnsurePlayerBuildingsTable1779775000000 implements MigrationInterface {
  name = 'EnsurePlayerBuildingsTable1779775000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Ensure enum types exist with all required values ───────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE buildings_type_enum AS ENUM (
          'command_center', 'mineral_extractor', 'gas_refinery', 'solar_plant',
          'barracks', 'academy', 'factory', 'spawning_pool', 'hatchery',
          'turret', 'shield_generator',
          'nano_forge', 'cyber_core', 'quantum_reactor', 'defense_matrix', 'repair_drone_bay'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE buildings_status_enum AS ENUM ('constructing', 'active', 'destroyed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // ── 2. Handle rename: "buildings" → "player_buildings" ───────────────────
    // If the old table exists under the original name and the new name doesn't,
    // rename it so existing rows are preserved.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'buildings'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'player_buildings'
        ) THEN
          ALTER TABLE buildings RENAME TO player_buildings;
        END IF;
      END $$
    `);

    // ── 3. If player_buildings still doesn't exist, create it fresh ───────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS player_buildings (
        id                        UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id                 UUID                     NOT NULL,
        type                      buildings_type_enum      NOT NULL,
        level                     INTEGER                  NOT NULL DEFAULT 1,
        status                    buildings_status_enum    NOT NULL DEFAULT 'constructing',
        construction_started_at   TIMESTAMPTZ,
        construction_complete_at  TIMESTAMPTZ,
        position_x                INTEGER                  NOT NULL DEFAULT 0,
        position_y                INTEGER                  NOT NULL DEFAULT 0,
        created_at                TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMPTZ              NOT NULL DEFAULT NOW()
      )
    `);

    // ── 4. Ensure all columns exist (covers renamed-table with old schema) ────
    await queryRunner.query(`
      ALTER TABLE player_buildings
        ADD COLUMN IF NOT EXISTS level                    INTEGER   NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS construction_started_at  TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS construction_complete_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS position_x              INTEGER   NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS position_y              INTEGER   NOT NULL DEFAULT 0
    `);

    // ── 5. Migrate enum column types if the table was renamed from "buildings" ─
    // The old "buildings" table used building_type/building_status (singular).
    // Convert them to buildings_type_enum/buildings_status_enum so TypeORM works.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'player_buildings'
            AND column_name = 'type'
            AND udt_name = 'building_type'
        ) THEN
          ALTER TABLE player_buildings
            ALTER COLUMN type TYPE buildings_type_enum
            USING type::text::buildings_type_enum;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'player_buildings'
            AND column_name = 'status'
            AND udt_name = 'building_status'
        ) THEN
          ALTER TABLE player_buildings
            ALTER COLUMN status TYPE buildings_status_enum
            USING status::text::buildings_status_enum;
        END IF;
      END $$
    `);

    // ── 6. Ensure indexes exist ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_player_buildings_player_id
        ON player_buildings (player_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_player_buildings_player_status
        ON player_buildings (player_id, status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op: reverting a structural rename/create is destructive.
    // To revert, restore from backup.
  }
}
