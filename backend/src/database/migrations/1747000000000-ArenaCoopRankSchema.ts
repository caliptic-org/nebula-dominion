import { MigrationInterface, QueryRunner } from 'typeorm';

export class ArenaCoopRankSchema1747000000000 implements MigrationInterface {
  name = 'ArenaCoopRankSchema1747000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Arena: per-player MMR / daily counters / arena points ─────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS arena_player_stats (
        user_id UUID PRIMARY KEY,
        mmr INT NOT NULL DEFAULT 1000,
        arena_points INT NOT NULL DEFAULT 0,
        wins INT NOT NULL DEFAULT 0,
        losses INT NOT NULL DEFAULT 0,
        matches_today INT NOT NULL DEFAULT 0,
        matches_today_day DATE,
        last_match_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_arena_player_mmr ON arena_player_stats(mmr DESC)`);

    // ─── Arena: persisted match log ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS arena_matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        winner_id UUID NOT NULL,
        loser_id UUID NOT NULL,
        winner_mmr_before INT NOT NULL,
        loser_mmr_before INT NOT NULL,
        winner_mmr_delta INT NOT NULL,
        loser_mmr_delta INT NOT NULL,
        winner_gem_reward INT NOT NULL DEFAULT 50,
        loser_gem_reward INT NOT NULL DEFAULT 10,
        week_key VARCHAR(16) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_arena_matches_winner_time ON arena_matches(winner_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_arena_matches_loser_time ON arena_matches(loser_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_arena_matches_week ON arena_matches(week_key, created_at DESC)`);

    // ─── Co-op Raid: 5-man instances + per-participant rows ────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE coop_raid_status_enum AS ENUM ('open', 'in_progress', 'completed', 'expired');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coop_raid_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL,
        leader_id UUID NOT NULL,
        boss_hp_total INT NOT NULL,
        boss_hp_remaining INT NOT NULL,
        status coop_raid_status_enum NOT NULL DEFAULT 'open',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        week_key VARCHAR(16) NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coop_raid_guild_week ON coop_raid_runs(guild_id, week_key)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coop_raid_status ON coop_raid_runs(status, expires_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coop_raid_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID NOT NULL,
        user_id UUID NOT NULL,
        damage_dealt INT NOT NULL DEFAULT 0,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        gas_drop INT NOT NULL DEFAULT 0,
        rare_mat_drop INT NOT NULL DEFAULT 0,
        mutation_essence_drop INT NOT NULL DEFAULT 0,
        rewards_granted BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_coop_raid_part_unique ON coop_raid_participants(run_id, user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coop_raid_part_user ON coop_raid_participants(user_id)`);

    // ─── Guild weekly rank snapshot (server-wide leaderboard) ──────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_weekly_rank (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        week_key VARCHAR(16) NOT NULL,
        guild_id UUID NOT NULL,
        guild_name VARCHAR(64) NOT NULL,
        guild_tag VARCHAR(5) NOT NULL,
        contribution_total BIGINT NOT NULL,
        rank INT NOT NULL,
        member_count INT NOT NULL,
        published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_weekly_rank_unique ON guild_weekly_rank(week_key, guild_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_weekly_rank_week ON guild_weekly_rank(week_key, rank)`);

    // ─── Champion Guild badge + gem revenue boost (top 10 of latest week) ─────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_champion_badge (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL,
        week_key VARCHAR(16) NOT NULL,
        rank INT NOT NULL,
        gem_boost_pct INT NOT NULL DEFAULT 10,
        active_from TIMESTAMPTZ NOT NULL,
        active_to TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_champion_unique ON guild_champion_badge(guild_id, week_key)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_champion_active ON guild_champion_badge(active_from, active_to)`);

    // ─── Inactive Guard markers (14-day eligibility) ───────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE inactive_action_enum AS ENUM ('kick_eligible', 'auto_kicked', 'guild_archived');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_inactive_marker (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL,
        user_id UUID,
        action inactive_action_enum NOT NULL,
        days_inactive INT NOT NULL,
        last_active_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_inactive_marker_guild ON guild_inactive_marker(guild_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_inactive_marker_user ON guild_inactive_marker(user_id, action)`);

    // ─── Mark guilds as archived (retire name/tag for reuse) ──────────────────
    await queryRunner.query(`
      ALTER TABLE guilds
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ
    `);

    // ─── Extend daily contribution with raid_damage_pct, research_xp, arena ──
    await queryRunner.query(`
      ALTER TABLE guild_contribution_daily
        ADD COLUMN IF NOT EXISTS raid_damage_pct NUMERIC(6, 4) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS research_xp_contributed INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS arena_match_played INT NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE guild_contribution_daily
        DROP COLUMN IF EXISTS raid_damage_pct,
        DROP COLUMN IF EXISTS research_xp_contributed,
        DROP COLUMN IF EXISTS arena_match_played
    `);
    await queryRunner.query(`ALTER TABLE guilds DROP COLUMN IF EXISTS archived_at`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_inactive_marker`);
    await queryRunner.query(`DROP TYPE IF EXISTS inactive_action_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_champion_badge`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_weekly_rank`);
    await queryRunner.query(`DROP TABLE IF EXISTS coop_raid_participants`);
    await queryRunner.query(`DROP TABLE IF EXISTS coop_raid_runs`);
    await queryRunner.query(`DROP TYPE IF EXISTS coop_raid_status_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS arena_matches`);
    await queryRunner.query(`DROP TABLE IF EXISTS arena_player_stats`);
  }
}
