import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnitSchema1746200000000 implements MigrationInterface {
  name = 'UnitSchema1746200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE race_enum AS ENUM ('human', 'zerg', 'hybrid')
    `);

    await queryRunner.query(`
      CREATE TYPE unit_status_enum AS ENUM ('alive', 'dead', 'in_battle')
    `);

    await queryRunner.query(`
      CREATE TABLE unit_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(128) NOT NULL,
        name_tr VARCHAR(128) NOT NULL,
        description TEXT,
        race race_enum NOT NULL,
        age_number INT NOT NULL,
        tier_level INT NOT NULL,
        global_tier INT NOT NULL,
        base_hp INT NOT NULL,
        base_attack INT NOT NULL,
        base_defense INT NOT NULL,
        base_speed INT NOT NULL,
        mineral_cost INT NOT NULL,
        energy_cost INT NOT NULL,
        population_cost INT NOT NULL DEFAULT 1,
        training_time_seconds INT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_unit_types_race_age_tier UNIQUE (race, age_number, tier_level)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_unit_types_race ON unit_types (race)`);
    await queryRunner.query(`CREATE INDEX idx_unit_types_age_tier ON unit_types (age_number, tier_level)`);
    await queryRunner.query(`CREATE INDEX idx_unit_types_global_tier ON unit_types (global_tier)`);

    await queryRunner.query(`
      CREATE TABLE units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        unit_type_id UUID NOT NULL REFERENCES unit_types(id) ON DELETE RESTRICT,
        current_hp INT NOT NULL,
        max_hp INT NOT NULL,
        attack INT NOT NULL,
        defense INT NOT NULL,
        speed INT NOT NULL,
        status unit_status_enum NOT NULL DEFAULT 'alive',
        experience INT NOT NULL DEFAULT 0,
        kills INT NOT NULL DEFAULT 0,
        mutation_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_units_player_id ON units (player_id)`);
    await queryRunner.query(`CREATE INDEX idx_units_player_status ON units (player_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_units_player_type ON units (player_id, unit_type_id)`);
    await queryRunner.query(`CREATE INDEX idx_units_created_at ON units (created_at DESC)`);

    // Auto-update updated_at for units table (reuse function if already exists from battle schema)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_unit_types_updated_at
        BEFORE UPDATE ON unit_types
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_units_updated_at
        BEFORE UPDATE ON units
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_units_updated_at ON units`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_unit_types_updated_at ON unit_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS units`);
    await queryRunner.query(`DROP TABLE IF EXISTS unit_types`);
    await queryRunner.query(`DROP TYPE IF EXISTS unit_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS race_enum`);
  }
}
