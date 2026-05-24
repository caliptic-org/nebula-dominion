import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aligns Postgres buildings_type_enum with the TypeScript BuildingType
 * enum in apps/game-server/src/buildings/entities/building.entity.ts.
 *
 * Before this migration the DB enum had 8 values (command_center, mine,
 * refinery, barracks, hangar, research_lab, shield_generator, turret)
 * while TS exposed 16. Sending any TS-only value (e.g. mineral_extractor,
 * solar_plant, academy) hit Postgres invalid_enum and bubbled as
 * "Internal server error" from POST /api/buildings.
 *
 * Adds 12 missing values so the frontend's SLUG_TO_BACKEND_TYPE map can
 * use any TS enum value. Existing rows with the legacy values
 * (mine/refinery/hangar/research_lab) stay valid — Postgres enum is
 * additive and IF NOT EXISTS makes the migration idempotent.
 *
 * Note: ALTER TYPE ... ADD VALUE is the only safe online enum change in
 * Postgres. It cannot run inside a transaction block, so the migration
 * runs each ALTER as its own statement (TypeORM handles this via
 * queryRunner.query — each ALTER is its own implicit transaction).
 */
export class AddTsBuildingEnumValues1779635000000 implements MigrationInterface {
  name = 'AddTsBuildingEnumValues1779635000000';

  private readonly newValues = [
    'mineral_extractor',
    'gas_refinery',
    'solar_plant',
    'academy',
    'factory',
    'spawning_pool',
    'hatchery',
    'nano_forge',
    'cyber_core',
    'quantum_reactor',
    'defense_matrix',
    'repair_drone_bay',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const value of this.newValues) {
      await queryRunner.query(
        `ALTER TYPE buildings_type_enum ADD VALUE IF NOT EXISTS '${value}'`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no built-in DROP VALUE for enum types. Reverting
    // would require: rename enum → create new without these → migrate
    // rows → drop old → rename new. Not worth automating for an additive
    // schema change; manual SQL if a real rollback is needed.
  }
}
