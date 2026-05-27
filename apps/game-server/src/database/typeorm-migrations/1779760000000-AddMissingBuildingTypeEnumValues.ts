import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds four building types to the PostgreSQL buildings_type_enum that were
 * present in the TypeScript BuildingType enum but missing from the initial
 * migration: academy, factory, spawning_pool, hatchery.
 *
 * The mismatch caused TypeORM to fail deserializing player_buildings rows
 * with those types, producing a 500 on GET /api/buildings/resources.
 *
 * ALTER TYPE ... ADD VALUE cannot run inside a transaction on PostgreSQL <12,
 * so transaction is disabled for this migration.
 */
export class AddMissingBuildingTypeEnumValues1779760000000 implements MigrationInterface {
  name = 'AddMissingBuildingTypeEnumValues1779760000000';

  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE buildings_type_enum ADD VALUE IF NOT EXISTS 'academy'`);
    await queryRunner.query(`ALTER TYPE buildings_type_enum ADD VALUE IF NOT EXISTS 'factory'`);
    await queryRunner.query(`ALTER TYPE buildings_type_enum ADD VALUE IF NOT EXISTS 'spawning_pool'`);
    await queryRunner.query(`ALTER TYPE buildings_type_enum ADD VALUE IF NOT EXISTS 'hatchery'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values; a full type recreation
    // would be needed to revert. This down() is intentionally a no-op.
  }
}
