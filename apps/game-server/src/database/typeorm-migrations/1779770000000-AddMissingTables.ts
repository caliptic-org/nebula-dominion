import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates all tables that have TypeORM entities but were never included in
 * the initial migration. Missing tables caused CrashLoopBackOff because
 * TypeORM's entity-sync queries fail at runtime with "relation does not exist".
 *
 * Tables added:
 *   - galaxy_node_garrison       (map garrisoning, queried by ResourceTickWorker)
 *   - guild_raids                (guild boss-raid system)
 *   - guild_raid_contributions   (per-member damage tracking)
 *   - guild_raid_drops           (essence rewards)
 *   - guild_research_states      (active research slots)
 *   - guild_research_contributions (per-member XP contributions)
 *   - mutation_essence_balances  (player essence wallet)
 *   - mutation_essence_weekly_grants (weekly cap tracking)
 *
 * All CREATE TABLE / CREATE TYPE statements use IF NOT EXISTS for idempotency.
 */
export class AddMissingTables1779770000000 implements MigrationInterface {
  name = 'AddMissingTables1779770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── galaxy_node_garrison ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS galaxy_node_garrison (
        id               SERIAL       PRIMARY KEY,
        node_id          VARCHAR(64)  NOT NULL,
        user_id          VARCHAR(255) NOT NULL,
        garrison_count   INTEGER      NOT NULL DEFAULT 0,
        node_kind        VARCHAR(32)  NOT NULL,
        captured_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_income_at   TIMESTAMP,
        CONSTRAINT galaxy_node_garrison_node_user_unique UNIQUE (node_id, user_id)
      )
    `);

    // ── guild_raids ────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE guild_raids_tier_enum AS ENUM ('normal', 'hard', 'elite');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE guild_raids_status_enum AS ENUM ('active', 'completed', 'expired');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_raids (
        id                     UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id               UUID                     NOT NULL,
        week_start             TIMESTAMPTZ              NOT NULL,
        week_end               TIMESTAMPTZ              NOT NULL,
        tier                   guild_raids_tier_enum    NOT NULL DEFAULT 'normal',
        boss_max_hp            BIGINT                   NOT NULL,
        boss_current_hp        BIGINT                   NOT NULL,
        member_count_snapshot  INTEGER                  NOT NULL,
        status                 guild_raids_status_enum  NOT NULL DEFAULT 'active',
        completed_at           TIMESTAMPTZ,
        drops_resolved_at      TIMESTAMPTZ,
        created_at             TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
        CONSTRAINT guild_raids_guild_week_unique UNIQUE (guild_id, week_start)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_guild_raids_guild_id ON guild_raids (guild_id)
    `);

    // ── guild_raid_contributions ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_raid_contributions (
        raid_id        UUID         NOT NULL,
        user_id        VARCHAR(255) NOT NULL,
        damage_dealt   BIGINT       NOT NULL DEFAULT 0,
        joined_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        last_attack_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        PRIMARY KEY (raid_id, user_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_guild_raid_contributions_user ON guild_raid_contributions (user_id)
    `);

    // ── guild_raid_drops ───────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE guild_raid_drops_source_enum AS ENUM ('base', 'top5_bonus', 'capped_excess');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_raid_drops (
        id              UUID                            PRIMARY KEY DEFAULT gen_random_uuid(),
        raid_id         UUID                            NOT NULL,
        user_id         VARCHAR(255)                    NOT NULL,
        essence_amount  INTEGER                         NOT NULL,
        source          guild_raid_drops_source_enum    NOT NULL,
        awarded_at      TIMESTAMPTZ                     NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_raid_drops_raid ON guild_raid_drops (raid_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_raid_drops_user ON guild_raid_drops (user_id)`);

    // ── guild_research_states ──────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE guild_research_states_branch_enum AS ENUM ('production', 'raid', 'expansion');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE guild_research_states_status_enum AS ENUM ('researching', 'completed', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_research_states (
        id              UUID                                  PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id        UUID                                  NOT NULL,
        research_id     VARCHAR(64)                           NOT NULL,
        branch          guild_research_states_branch_enum     NOT NULL,
        level           INTEGER                               NOT NULL,
        status          guild_research_states_status_enum     NOT NULL DEFAULT 'researching',
        xp_required     INTEGER                               NOT NULL,
        xp_contributed  INTEGER                               NOT NULL DEFAULT 0,
        slot_week_start TIMESTAMPTZ                           NOT NULL,
        started_at      TIMESTAMPTZ                           NOT NULL DEFAULT NOW(),
        deadline_at     TIMESTAMPTZ                           NOT NULL,
        completed_at    TIMESTAMPTZ,
        selected_by     VARCHAR(255)                          NOT NULL,
        created_at      TIMESTAMPTZ                           NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ                           NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_guild_research_states_guild ON guild_research_states (guild_id)
    `);

    // ── guild_research_contributions ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_research_contributions (
        research_state_id UUID         NOT NULL,
        user_id           VARCHAR(255) NOT NULL,
        xp_contributed    INTEGER      NOT NULL DEFAULT 0,
        last_contrib_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        PRIMARY KEY (research_state_id, user_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_guild_research_contrib_user ON guild_research_contributions (user_id)
    `);

    // ── mutation_essence_balances ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mutation_essence_balances (
        user_id    VARCHAR(255) PRIMARY KEY,
        balance    INTEGER      NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    // ── mutation_essence_weekly_grants ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mutation_essence_weekly_grants (
        user_id        VARCHAR(255) NOT NULL,
        iso_week_start TIMESTAMPTZ  NOT NULL,
        granted_count  INTEGER      NOT NULL DEFAULT 0,
        updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, iso_week_start)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_essence_weekly_week ON mutation_essence_weekly_grants (iso_week_start)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS mutation_essence_weekly_grants`);
    await queryRunner.query(`DROP TABLE IF EXISTS mutation_essence_balances`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_research_contributions`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_research_states`);
    await queryRunner.query(`DROP TYPE IF EXISTS guild_research_states_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS guild_research_states_branch_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_raid_drops`);
    await queryRunner.query(`DROP TYPE IF EXISTS guild_raid_drops_source_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_raid_contributions`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_raids`);
    await queryRunner.query(`DROP TYPE IF EXISTS guild_raids_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS guild_raids_tier_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS galaxy_node_garrison`);
  }
}
