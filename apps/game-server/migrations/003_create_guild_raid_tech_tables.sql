-- Migration: 003_create_guild_raid_tech_tables
-- Lonca raid + tech ağacı backend altyapısı
-- CAL-240: Faz 3 — haftalık raid scheduler, drop tablosu, araştırma dalları, lonca buff'ları

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── guild_raids ──────────────────────────────────────────────────────────────
-- One row per (guild, week). Created by the weekly scheduler at Monday 00:00 UTC.
-- Closes Sunday 23:59 UTC. Boss HP scales with active member count.
DO $$ BEGIN
    CREATE TYPE guild_raid_tier AS ENUM ('normal', 'hard', 'elite');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE guild_raid_status AS ENUM ('active', 'completed', 'expired');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS guild_raids (
    id                     UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id               UUID              NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    week_start             TIMESTAMPTZ       NOT NULL,
    week_end               TIMESTAMPTZ       NOT NULL,
    tier                   guild_raid_tier   NOT NULL DEFAULT 'normal',
    boss_max_hp            BIGINT            NOT NULL,
    boss_current_hp        BIGINT            NOT NULL,
    member_count_snapshot  INT               NOT NULL,
    status                 guild_raid_status NOT NULL DEFAULT 'active',
    completed_at           TIMESTAMPTZ,
    drops_resolved_at      TIMESTAMPTZ,
    created_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT guild_raids_member_count_min   CHECK (member_count_snapshot >= 3),
    CONSTRAINT guild_raids_hp_nonneg          CHECK (boss_current_hp >= 0),
    CONSTRAINT guild_raids_hp_bounded         CHECK (boss_current_hp <= boss_max_hp),
    CONSTRAINT guild_raids_week_order         CHECK (week_end > week_start),
    CONSTRAINT guild_raids_guild_week_unique  UNIQUE (guild_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_guild_raids_guild_week ON guild_raids (guild_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_guild_raids_status     ON guild_raids (status);
CREATE INDEX IF NOT EXISTS idx_guild_raids_week_end   ON guild_raids (week_end);

DROP TRIGGER IF EXISTS trg_guild_raids_updated_at ON guild_raids;
CREATE TRIGGER trg_guild_raids_updated_at
    BEFORE UPDATE ON guild_raids
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── guild_raid_contributions ─────────────────────────────────────────────────
-- One row per (raid, user). Tracks damage dealt; used for top-5 bonus drops.
CREATE TABLE IF NOT EXISTS guild_raid_contributions (
    raid_id         UUID         NOT NULL REFERENCES guild_raids(id) ON DELETE CASCADE,
    user_id         VARCHAR(255) NOT NULL,
    damage_dealt    BIGINT       NOT NULL DEFAULT 0,
    joined_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_attack_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    PRIMARY KEY (raid_id, user_id),
    CONSTRAINT guild_raid_contributions_damage_nonneg CHECK (damage_dealt >= 0)
);

CREATE INDEX IF NOT EXISTS idx_guild_raid_contributions_user
    ON guild_raid_contributions (user_id);
CREATE INDEX IF NOT EXISTS idx_guild_raid_contributions_damage
    ON guild_raid_contributions (raid_id, damage_dealt DESC);

-- ─── guild_raid_drops ─────────────────────────────────────────────────────────
-- Drops awarded per (raid, user). Source records *why* the drop was granted.
DO $$ BEGIN
    CREATE TYPE guild_raid_drop_source AS ENUM ('base', 'top5_bonus', 'capped_excess');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS guild_raid_drops (
    id              UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
    raid_id         UUID                   NOT NULL REFERENCES guild_raids(id) ON DELETE CASCADE,
    user_id         VARCHAR(255)           NOT NULL,
    essence_amount  INT                    NOT NULL,
    source          guild_raid_drop_source NOT NULL,
    awarded_at      TIMESTAMPTZ            NOT NULL DEFAULT NOW(),

    CONSTRAINT guild_raid_drops_amount_nonneg CHECK (essence_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_guild_raid_drops_raid ON guild_raid_drops (raid_id);
CREATE INDEX IF NOT EXISTS idx_guild_raid_drops_user ON guild_raid_drops (user_id, awarded_at DESC);
-- A user receives at most one row per (raid, source) to keep idempotent grants simple
CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_raid_drops_unique
    ON guild_raid_drops (raid_id, user_id, source);

-- ─── mutation_essence_balances ────────────────────────────────────────────────
-- Per-player mutation essence wallet. Producer: this raid system + PvE/event drops
-- (CAL-233). Consumer: merge cost (T4+) in CAL-233. Hot-reload safe — config-driven
-- drop rates and merge costs both live separately.
CREATE TABLE IF NOT EXISTS mutation_essence_balances (
    user_id     VARCHAR(255) PRIMARY KEY,
    balance     INT          NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT mutation_essence_balance_nonneg CHECK (balance >= 0)
);

DROP TRIGGER IF EXISTS trg_mutation_essence_balances_updated_at ON mutation_essence_balances;
CREATE TRIGGER trg_mutation_essence_balances_updated_at
    BEFORE UPDATE ON mutation_essence_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── mutation_essence_weekly_grants ───────────────────────────────────────────
-- Enforces the 4-essence/player/week cap from CAL-233's anti-inflation budget.
-- iso_week_start = Monday 00:00 UTC of the week the grant counts toward.
CREATE TABLE IF NOT EXISTS mutation_essence_weekly_grants (
    user_id          VARCHAR(255) NOT NULL,
    iso_week_start   TIMESTAMPTZ  NOT NULL,
    granted_count    INT          NOT NULL DEFAULT 0,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, iso_week_start),
    CONSTRAINT mutation_essence_weekly_grants_nonneg CHECK (granted_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_mutation_essence_weekly_grants_week
    ON mutation_essence_weekly_grants (iso_week_start);

DROP TRIGGER IF EXISTS trg_mutation_essence_weekly_grants_updated_at ON mutation_essence_weekly_grants;
CREATE TRIGGER trg_mutation_essence_weekly_grants_updated_at
    BEFORE UPDATE ON mutation_essence_weekly_grants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── guild_research_states ────────────────────────────────────────────────────
-- One row per (guild, research_id) instance. Each guild can have up to 3
-- concurrently-active research slots per ISO week (slot_week_start). Research
-- definitions themselves live in code (apps/game-server/src/guilds/research.config.ts).
DO $$ BEGIN
    CREATE TYPE guild_research_branch AS ENUM ('production', 'raid', 'expansion');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE guild_research_status AS ENUM ('researching', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS guild_research_states (
    id                UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id          UUID                  NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    research_id       VARCHAR(64)           NOT NULL,
    branch            guild_research_branch NOT NULL,
    level             INT                   NOT NULL,
    status            guild_research_status NOT NULL DEFAULT 'researching',
    xp_required       INT                   NOT NULL,
    xp_contributed    INT                   NOT NULL DEFAULT 0,
    slot_week_start   TIMESTAMPTZ           NOT NULL,
    started_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    deadline_at       TIMESTAMPTZ           NOT NULL,
    completed_at      TIMESTAMPTZ,
    selected_by       VARCHAR(255)          NOT NULL,
    created_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

    CONSTRAINT guild_research_xp_required_min  CHECK (xp_required >= 100000),
    CONSTRAINT guild_research_xp_required_max  CHECK (xp_required <= 500000),
    CONSTRAINT guild_research_xp_contrib_nonneg CHECK (xp_contributed >= 0),
    CONSTRAINT guild_research_level_min        CHECK (level >= 1)
);

CREATE INDEX IF NOT EXISTS idx_guild_research_states_guild
    ON guild_research_states (guild_id, status);
CREATE INDEX IF NOT EXISTS idx_guild_research_states_slot
    ON guild_research_states (guild_id, slot_week_start);
CREATE INDEX IF NOT EXISTS idx_guild_research_states_deadline
    ON guild_research_states (status, deadline_at)
    WHERE status = 'researching';
-- A guild can only have one active state per (research_id, level) at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_research_states_active_unique
    ON guild_research_states (guild_id, research_id, level)
    WHERE status = 'researching';

DROP TRIGGER IF EXISTS trg_guild_research_states_updated_at ON guild_research_states;
CREATE TRIGGER trg_guild_research_states_updated_at
    BEFORE UPDATE ON guild_research_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── guild_research_contributions ─────────────────────────────────────────────
-- Per (research_state, user) contribution_xp tracker. Used for telemetry &
-- proportional reward attribution.
CREATE TABLE IF NOT EXISTS guild_research_contributions (
    research_state_id  UUID         NOT NULL REFERENCES guild_research_states(id) ON DELETE CASCADE,
    user_id            VARCHAR(255) NOT NULL,
    xp_contributed     INT          NOT NULL DEFAULT 0,
    last_contrib_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    PRIMARY KEY (research_state_id, user_id),
    CONSTRAINT guild_research_contributions_xp_nonneg CHECK (xp_contributed >= 0)
);

CREATE INDEX IF NOT EXISTS idx_guild_research_contrib_user
    ON guild_research_contributions (user_id);

COMMENT ON TABLE guild_raids                    IS 'Weekly guild raid instance — CAL-240';
COMMENT ON TABLE guild_raid_contributions       IS 'Per-user damage-dealt within a raid';
COMMENT ON TABLE guild_raid_drops               IS 'Mutation essence drops awarded after raid completion';
COMMENT ON TABLE mutation_essence_balances      IS 'Per-player mutation essence wallet (consumed by merge T4+, CAL-233)';
COMMENT ON TABLE mutation_essence_weekly_grants IS 'Enforces 4 essence / player / ISO week cap (anti-inflation, CAL-233)';
COMMENT ON TABLE guild_research_states          IS 'Active and completed guild tech-tree research states — CAL-240';
COMMENT ON TABLE guild_research_contributions   IS 'Per-user XP contribution to a specific research state';
COMMENT ON COLUMN guild_raids.boss_max_hp       IS 'base_hp * sqrt(member_count_snapshot), tier-multiplied';
COMMENT ON COLUMN guild_raids.member_count_snapshot IS 'Floor 3; matches guilds.member_count at scheduler time';
COMMENT ON COLUMN guild_research_states.slot_week_start IS 'ISO Monday 00:00 UTC of the week the slot was consumed';
