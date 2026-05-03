import { MigrationInterface, QueryRunner } from 'typeorm';

export class MapSchema1746400000000 implements MigrationInterface {
  name = 'MapSchema1746400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enum ──────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE map_action_type AS ENUM (
        'attack', 'scout', 'gather', 'rally', 'defend', 'upgrade', 'flee'
      )
    `);

    // ─── player_resources ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE player_resources (
        player_id      UUID PRIMARY KEY,
        mineral        INT NOT NULL DEFAULT 2400,
        gas            INT NOT NULL DEFAULT 840,
        energy         INT NOT NULL DEFAULT 1200,
        population     INT NOT NULL DEFAULT 12,
        population_cap INT NOT NULL DEFAULT 50,
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_player_resources_updated_at
        BEFORE UPDATE ON player_resources
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // ─── map_action_logs ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE map_action_logs (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id   UUID NOT NULL,
        action      map_action_type NOT NULL,
        target_col  INT NOT NULL,
        target_row  INT NOT NULL,
        result      TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_mal_player     ON map_action_logs (player_id)`);
    await queryRunner.query(`CREATE INDEX idx_mal_player_ts  ON map_action_logs (player_id, created_at DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS map_action_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS player_resources`);
    await queryRunner.query(`DROP TYPE  IF EXISTS map_action_type`);
  }
}
