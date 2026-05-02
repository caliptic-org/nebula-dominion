import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnalyticsSchema1746400000000 implements MigrationInterface {
  name = 'AnalyticsSchema1746400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(128) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        race VARCHAR(32),
        tier_age SMALLINT,
        tier_level SMALLINT,
        vip_level SMALLINT,
        device VARCHAR(128),
        app_version VARCHAR(32),
        client_ts TIMESTAMPTZ,
        properties JSONB NOT NULL DEFAULT '{}',
        server_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_analytics_event_type_ts ON analytics_events (event_type, server_ts DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_analytics_user_ts ON analytics_events (user_id, server_ts DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_analytics_session ON analytics_events (session_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_analytics_server_ts ON analytics_events (server_ts DESC)`,
    );

    // Partition-friendly: range partitioning hint via check constraint example (optional)
    // For large-scale you would use pg_partman or manual monthly partitions here
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS analytics_events`);
  }
}
