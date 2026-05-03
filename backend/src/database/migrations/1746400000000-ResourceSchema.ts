import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResourceSchema1746400000000 implements MigrationInterface {
  name = 'ResourceSchema1746400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── feature_flags ────────────────────────────────────────────────────────
    // Single config override layer shared by resource, XP, and VIP systems.
    // segment_overrides: JSONB keyed by segment name (whale/f2p/new_user/…)
    await queryRunner.query(`
      CREATE TABLE feature_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        flag_key VARCHAR(128) NOT NULL UNIQUE,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        value JSONB NOT NULL DEFAULT '{}',
        segment_overrides JSONB NOT NULL DEFAULT '{}',
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_feature_flags_key ON feature_flags (flag_key)`);

    await queryRunner.query(`
      CREATE TRIGGER update_feature_flags_updated_at
        BEFORE UPDATE ON feature_flags
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // ─── player_segments ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE player_segments (
        player_id UUID PRIMARY KEY,
        segment VARCHAR(32) NOT NULL DEFAULT 'f2p',
        account_age_days INT NOT NULL DEFAULT 0,
        cumulative_spend_cents INT NOT NULL DEFAULT 0,
        vip_level INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_player_segments_segment ON player_segments (segment)`);

    // ─── resource_configs ─────────────────────────────────────────────────────
    // One row per resource type. Admin can hot-reload by updating rows.
    await queryRunner.query(`
      CREATE TYPE resource_type_enum AS ENUM ('mineral', 'gas', 'energy', 'population')
    `);

    await queryRunner.query(`
      CREATE TABLE resource_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type resource_type_enum NOT NULL UNIQUE,
        base_rate_per_hour INT NOT NULL,
        cap_base INT NOT NULL,
        cap_multipliers JSONB NOT NULL DEFAULT '{"1":1,"2":2.5,"3":6,"4":14,"5":30,"6":60}',
        building_exponent DECIMAL(4,2) NOT NULL DEFAULT 1.25,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_resource_configs_updated_at
        BEFORE UPDATE ON resource_configs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // Seed base rates from analysis (Age 1, Tier-1 building)
    await queryRunner.query(`
      INSERT INTO resource_configs (resource_type, base_rate_per_hour, cap_base, cap_multipliers, building_exponent)
      VALUES
        ('mineral',    1000, 24000, '{"1":1,"2":2.5,"3":6,"4":14,"5":30,"6":60}', 1.25),
        ('gas',         600, 14400, '{"1":1,"2":2.5,"3":6,"4":14,"5":30,"6":60}', 1.25),
        ('energy',      350,  8400, '{"1":1,"2":2.5,"3":6,"4":14,"5":30,"6":60}', 1.25),
        ('population',    0,     0, '{"1":50,"2":80,"3":120,"4":180,"5":240,"6":320}', 1.00)
    `);

    // ─── player_resources ─────────────────────────────────────────────────────
    // One row per player per resource. Updated on login (offline delta calc).
    await queryRunner.query(`
      CREATE TABLE player_resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        resource_type resource_type_enum NOT NULL,
        amount BIGINT NOT NULL DEFAULT 0,
        current_age INT NOT NULL DEFAULT 1 CHECK (current_age BETWEEN 1 AND 6),
        building_level INT NOT NULL DEFAULT 1,
        last_collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (player_id, resource_type)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_player_resources_player ON player_resources (player_id)`);
    await queryRunner.query(`CREATE INDEX idx_player_resources_player_type ON player_resources (player_id, resource_type)`);

    await queryRunner.query(`
      CREATE TRIGGER update_player_resources_updated_at
        BEFORE UPDATE ON player_resources
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_player_resources_updated_at ON player_resources`);
    await queryRunner.query(`DROP TABLE IF EXISTS player_resources`);
    await queryRunner.query(`DROP TABLE IF EXISTS resource_configs`);
    await queryRunner.query(`DROP TYPE IF EXISTS resource_type_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS player_segments`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags`);
    await queryRunner.query(`DROP TABLE IF EXISTS feature_flags`);
  }
}
