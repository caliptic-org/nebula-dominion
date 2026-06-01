import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the missing İnsan merge-chain unit types to player_units_type_enum.
 *
 * The /merge "Promosyon Töreni" screen advertises a 5-tier promotion ladder
 *   Marine → Sniper → Mecha Walker → Genetic Warrior → Captain
 * but only the four bottom-rung values existed in the enum (marine, medic,
 * siege_tank, ghost). Anything past Marine fell through with the cryptic
 * "Genetic Warrior üretemiyorum" complaint — the unit type literally
 * couldn't be inserted into the player_units row.
 *
 * Postgres ALTER TYPE ADD VALUE is one-way; the down migration is a no-op
 * because removing an enum label after rows reference it would require
 * data backfill we don't want to script here. Safe: the new labels start
 * unused; rollback by ignoring them in code.
 */
export class AddInsanMergeUnitTypes1779820000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const values = [
      'sniper',
      'engineer',
      'mecha_walker',
      'genetic_warrior',
      'captain',
    ];
    for (const v of values) {
      await queryRunner.query(
        `ALTER TYPE player_units_type_enum ADD VALUE IF NOT EXISTS '${v}'`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres doesn't support DROP VALUE on an enum once it's been
    // committed and potentially referenced. Down migration intentionally
    // does nothing — operators rolling back should treat these as
    // unused-but-present labels.
  }
}
