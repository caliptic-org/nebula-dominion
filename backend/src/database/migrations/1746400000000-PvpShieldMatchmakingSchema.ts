import { MigrationInterface, QueryRunner } from 'typeorm';

export class PvpShieldMatchmakingSchema1746400000000 implements MigrationInterface {
  name = 'PvpShieldMatchmakingSchema1746400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Player Shields ─────────────────────────────────────────────────────────
    // Tracks the 7-day PvP newbie shield per player.
    // Shield is considered active when: registered_at + 7 days > NOW() AND shield_removed_at IS NULL
    await queryRunner.query(`
      CREATE TABLE player_shields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL UNIQUE,
        registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        shield_removed_at TIMESTAMPTZ,
        shield_removal_bonus_granted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_ps_player_id ON player_shields (player_id)`);
    await queryRunner.query(`CREATE INDEX idx_ps_registered_at ON player_shields (registered_at)`);

    await queryRunner.query(`
      CREATE TRIGGER update_player_shields_updated_at
        BEFORE UPDATE ON player_shields
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // ─── PvP Stats ───────────────────────────────────────────────────────────────
    // Tracks per-player PvP statistics including consecutive losses for comeback bonus.
    await queryRunner.query(`
      CREATE TABLE pvp_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL UNIQUE,
        consecutive_losses INT NOT NULL DEFAULT 0,
        total_wins INT NOT NULL DEFAULT 0,
        total_losses INT NOT NULL DEFAULT 0,
        comeback_bonuses_received INT NOT NULL DEFAULT 0,
        last_comeback_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_pvp_stats_player_id ON pvp_stats (player_id)`);

    await queryRunner.query(`
      CREATE TRIGGER update_pvp_stats_updated_at
        BEFORE UPDATE ON pvp_stats
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_pvp_stats_updated_at ON pvp_stats`);
    await queryRunner.query(`DROP TABLE IF EXISTS pvp_stats`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_player_shields_updated_at ON player_shields`);
    await queryRunner.query(`DROP TABLE IF EXISTS player_shields`);
  }
}
