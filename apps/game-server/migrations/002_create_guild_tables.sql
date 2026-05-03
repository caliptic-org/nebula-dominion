-- Migration: 002_create_guild_tables
-- Lonca veri modeli: guilds, guild_members, guild_events, guild_tutorial_states
-- CAL-235: Faz 1 backend altyapısı (gating issue for Lonca features)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── guilds ───────────────────────────────────────────────────────────────────
-- Player-created guilds (loncalar)
CREATE TABLE IF NOT EXISTS guilds (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(100) NOT NULL,
    tag              VARCHAR(5)   NOT NULL,
    leader_id        VARCHAR(255) NOT NULL,
    age_unlocked_at  TIMESTAMPTZ,
    tier_score       INT          NOT NULL DEFAULT 0,
    member_count     INT          NOT NULL DEFAULT 1,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT guilds_name_unique         UNIQUE (name),
    CONSTRAINT guilds_tag_unique          UNIQUE (tag),
    CONSTRAINT guilds_tag_length          CHECK (char_length(tag) BETWEEN 3 AND 5),
    CONSTRAINT guilds_tier_score_nonneg   CHECK (tier_score >= 0),
    CONSTRAINT guilds_member_count_nonneg CHECK (member_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_guilds_leader ON guilds (leader_id);
CREATE INDEX IF NOT EXISTS idx_guilds_tag    ON guilds (tag);

DROP TRIGGER IF EXISTS trg_guilds_updated_at ON guilds;
CREATE TRIGGER trg_guilds_updated_at
    BEFORE UPDATE ON guilds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── guild_members ────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE guild_role AS ENUM ('leader', 'officer', 'member');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS guild_members (
    guild_id          UUID         NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id           VARCHAR(255) NOT NULL,
    role              guild_role   NOT NULL DEFAULT 'member',
    joined_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    contribution_pts  INT          NOT NULL DEFAULT 0,
    last_active_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    PRIMARY KEY (guild_id, user_id),
    CONSTRAINT guild_members_contribution_nonneg CHECK (contribution_pts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_guild_members_user  ON guild_members (user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members (guild_id);
-- Enforce single-guild membership per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_members_user_unique ON guild_members (user_id);

-- ─── guild_events ─────────────────────────────────────────────────────────────
-- Append-only event log: join, leave, donate, raid_attend, chat_message, research_contrib
DO $$ BEGIN
    CREATE TYPE guild_event_type AS ENUM (
        'join', 'leave', 'donate', 'raid_attend', 'chat_message', 'research_contrib'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS guild_events (
    id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id    UUID             NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id     VARCHAR(255)     NOT NULL,
    type        guild_event_type NOT NULL,
    payload     JSONB            NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guild_events_guild ON guild_events (guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guild_events_user  ON guild_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guild_events_type  ON guild_events (type);

-- ─── guild_tutorial_states ────────────────────────────────────────────────────
-- Per-player guild tutorial state machine
-- Triggered when total_xp >= 18,000 (Çağ 3 unlock threshold, see CAL-230)
DO $$ BEGIN
    CREATE TYPE guild_tutorial_step AS ENUM (
        'not_started', 'guild_chosen', 'first_donation', 'first_quest', 'completed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS guild_tutorial_states (
    id                 UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            VARCHAR(255)        NOT NULL,
    tutorial_required  BOOLEAN             NOT NULL DEFAULT false,
    state              guild_tutorial_step NOT NULL DEFAULT 'not_started',
    reward_granted     BOOLEAN             NOT NULL DEFAULT false,
    completed_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT guild_tutorial_states_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_tutorial_user  ON guild_tutorial_states (user_id);
CREATE INDEX IF NOT EXISTS idx_guild_tutorial_state ON guild_tutorial_states (state);

DROP TRIGGER IF EXISTS trg_guild_tutorial_updated_at ON guild_tutorial_states;
CREATE TRIGGER trg_guild_tutorial_updated_at
    BEFORE UPDATE ON guild_tutorial_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE guilds                IS 'Player-created guilds (loncalar) — CAL-235 Faz 1';
COMMENT ON TABLE guild_members         IS 'Guild membership and role assignments';
COMMENT ON TABLE guild_events          IS 'Append-only event log for guild activity';
COMMENT ON TABLE guild_tutorial_states IS 'Per-player guild tutorial state machine (Çağ 3 onboarding)';
COMMENT ON COLUMN guilds.tag           IS '3-5 character unique guild identifier tag';
COMMENT ON COLUMN guilds.tier_score    IS 'Aggregate guild tier score (research, raids, member contributions)';
COMMENT ON COLUMN guild_tutorial_states.state IS 'not_started → guild_chosen → first_donation → first_quest → completed';
