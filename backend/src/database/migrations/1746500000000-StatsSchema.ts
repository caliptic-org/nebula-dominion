import { MigrationInterface, QueryRunner } from 'typeorm';

export class StatsSchema1746500000000 implements MigrationInterface {
  name = 'StatsSchema1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE buff_type_enum AS ENUM ('attack', 'defense', 'production', 'xp', 'speed')
    `);

    await queryRunner.query(`
      CREATE TABLE player_buffs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        buff_type buff_type_enum NOT NULL,
        icon VARCHAR(128) NOT NULL,
        effect_value FLOAT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_player_buffs_player_id ON player_buffs (player_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_player_buffs_player_expires ON player_buffs (player_id, expires_at)`,
    );

    await queryRunner.query(`
      CREATE TABLE player_resources (
        player_id UUID PRIMARY KEY,
        mineral_per_hour FLOAT NOT NULL DEFAULT 0,
        gas_per_hour FLOAT NOT NULL DEFAULT 0,
        energy_per_hour FLOAT NOT NULL DEFAULT 0,
        population_current INT NOT NULL DEFAULT 0,
        population_capacity INT NOT NULL DEFAULT 100,
        prev_mineral_per_hour FLOAT NOT NULL DEFAULT 0,
        prev_gas_per_hour FLOAT NOT NULL DEFAULT 0,
        prev_energy_per_hour FLOAT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE player_power (
        player_id UUID PRIMARY KEY,
        commander_score INT NOT NULL DEFAULT 0,
        research_score INT NOT NULL DEFAULT 0,
        race VARCHAR(32) NOT NULL DEFAULT 'human',
        prev_commander_score INT NOT NULL DEFAULT 0,
        prev_research_score INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS player_power`);
    await queryRunner.query(`DROP TABLE IF EXISTS player_resources`);
    await queryRunner.query(`DROP TABLE IF EXISTS player_buffs`);
    await queryRunner.query(`DROP TYPE IF EXISTS buff_type_enum`);
  }
}
