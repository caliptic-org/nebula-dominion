import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuildSchema1746800000000 implements MigrationInterface {
  name = 'GuildSchema1746800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Guild core (CAL-235 minimal scaffolding) ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guilds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(64) NOT NULL,
        tag VARCHAR(5) NOT NULL UNIQUE,
        leader_id UUID NOT NULL,
        age_unlocked_at INT NOT NULL DEFAULT 3,
        tier_score INT NOT NULL DEFAULT 0,
        member_count INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE guild_role_enum AS ENUM ('leader', 'officer', 'member');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL,
        user_id UUID NOT NULL UNIQUE,
        role guild_role_enum NOT NULL DEFAULT 'member',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        contribution_pts INT NOT NULL DEFAULT 0,
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL,
        user_id UUID NOT NULL,
        event_type VARCHAR(32) NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_events_guild_time ON guild_events(guild_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_events_user_type_time ON guild_events(user_id, event_type, created_at DESC)`);

    // ─── Chat ──────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL,
        user_id UUID NOT NULL,
        content VARCHAR(500) NOT NULL,
        filtered BOOLEAN NOT NULL DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_chat_guild_time ON guild_chat_messages(guild_id, created_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_mutes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL,
        user_id UUID NOT NULL,
        muted_by UUID NOT NULL,
        reason VARCHAR(200),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_mutes_lookup ON guild_mutes(guild_id, user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_mutes_expires ON guild_mutes(expires_at)`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE guild_report_status_enum AS ENUM ('open', 'reviewed', 'actioned', 'dismissed');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL,
        reporter_id UUID NOT NULL,
        target_user_id UUID NOT NULL,
        message_id UUID,
        reason VARCHAR(500) NOT NULL,
        status guild_report_status_enum NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_reports_status ON guild_reports(guild_id, status)`);

    // ─── Donate ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE donate_request_status_enum AS ENUM ('open', 'fulfilled', 'expired', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS donate_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL,
        requester_id UUID NOT NULL,
        resource_type VARCHAR(32) NOT NULL,
        amount_requested INT NOT NULL,
        amount_fulfilled INT NOT NULL DEFAULT 0,
        status donate_request_status_enum NOT NULL DEFAULT 'open',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_donate_req_open ON donate_requests(guild_id, status, expires_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_donate_req_requester ON donate_requests(requester_id, created_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS donate_fulfillments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID NOT NULL,
        guild_id UUID NOT NULL,
        donor_id UUID NOT NULL,
        recipient_id UUID NOT NULL,
        resource_type VARCHAR(32) NOT NULL,
        amount INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_donate_fulfill_request ON donate_fulfillments(request_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_donate_fulfill_donor ON donate_fulfillments(donor_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_donate_fulfill_pair ON donate_fulfillments(donor_id, recipient_id, created_at DESC)`);

    // ─── Contribution score (daily aggregate) ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_contribution_daily (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL,
        user_id UUID NOT NULL,
        day DATE NOT NULL,
        donate_made INT NOT NULL DEFAULT 0,
        donate_received INT NOT NULL DEFAULT 0,
        chat_message_count INT NOT NULL DEFAULT 0,
        points INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_contrib_user_day ON guild_contribution_daily(user_id, day)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contrib_guild_day ON guild_contribution_daily(guild_id, day)`);

    // ─── Profanity word list (config-driven) ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_profanity_words (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        word VARCHAR(64) NOT NULL UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Seed a minimal default profanity list — admins can extend via API
    await queryRunner.query(`
      INSERT INTO guild_profanity_words (word) VALUES
        ('badword1'), ('badword2'), ('slur1')
      ON CONFLICT (word) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS guild_profanity_words`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_contribution_daily`);
    await queryRunner.query(`DROP TABLE IF EXISTS donate_fulfillments`);
    await queryRunner.query(`DROP TABLE IF EXISTS donate_requests`);
    await queryRunner.query(`DROP TYPE IF EXISTS donate_request_status_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_reports`);
    await queryRunner.query(`DROP TYPE IF EXISTS guild_report_status_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_mutes`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_chat_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS guild_members`);
    await queryRunner.query(`DROP TYPE IF EXISTS guild_role_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS guilds`);
  }
}
