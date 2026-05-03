import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeaderboardSchema1746500000000 implements MigrationInterface {
  name = 'LeaderboardSchema1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE leaderboard_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        category VARCHAR(20) NOT NULL,
        period_type VARCHAR(20) NOT NULL,
        period_key VARCHAR(50) NOT NULL,
        rank INT NOT NULL,
        score BIGINT NOT NULL DEFAULT 0,
        snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_lb_snapshot_unique
        ON leaderboard_snapshots (user_id, category, period_type, period_key)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_lb_snapshot_lookup
        ON leaderboard_snapshots (category, period_type, period_key, rank ASC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_lb_snapshot_user
        ON leaderboard_snapshots (user_id, category, period_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS leaderboard_snapshots`);
  }
}
