-- Migration: 001_create_progression_tables
-- Creates player progression tables for the Age 1 (Level 1-9) tier system

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── player_levels ────────────────────────────────────────────────────────────
-- Stores each player's current age/level/tier/XP state
CREATE TABLE IF NOT EXISTS player_levels (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          VARCHAR(255) NOT NULL,
    current_age      INT         NOT NULL DEFAULT 1,
    current_level    INT         NOT NULL DEFAULT 1,
    current_tier     INT         NOT NULL DEFAULT 1,
    current_xp       INT         NOT NULL DEFAULT 0,
    total_xp         INT         NOT NULL DEFAULT 0,
    unlocked_content TEXT[]      NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT player_levels_user_id_unique UNIQUE (user_id),
    CONSTRAINT player_levels_level_range    CHECK (current_level BETWEEN 1 AND 9),
    CONSTRAINT player_levels_age_range      CHECK (current_age   BETWEEN 1 AND 6),
    CONSTRAINT player_levels_tier_range     CHECK (current_tier  BETWEEN 1 AND 3),
    CONSTRAINT player_levels_xp_nonneg      CHECK (current_xp   >= 0),
    CONSTRAINT player_levels_total_xp_nonneg CHECK (total_xp    >= 0)
);

CREATE INDEX IF NOT EXISTS idx_player_levels_user_id ON player_levels (user_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_player_levels_updated_at ON player_levels;
CREATE TRIGGER trg_player_levels_updated_at
    BEFORE UPDATE ON player_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── xp_transactions ─────────────────────────────────────────────────────────
-- Append-only audit log of every XP award event
CREATE TABLE IF NOT EXISTS xp_transactions (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       VARCHAR(255) NOT NULL,
    source        VARCHAR(64) NOT NULL,
    base_amount   INT         NOT NULL,
    multiplier    NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    final_amount  INT         NOT NULL,
    level_before  INT         NOT NULL,
    level_after   INT         NOT NULL,
    reference_id  VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT xp_transactions_base_amount_pos   CHECK (base_amount  > 0),
    CONSTRAINT xp_transactions_final_amount_pos  CHECK (final_amount > 0),
    CONSTRAINT xp_transactions_multiplier_pos    CHECK (multiplier   > 0)
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id    ON xp_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_time  ON xp_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source     ON xp_transactions (source);

COMMENT ON TABLE player_levels    IS 'Age 1–6 × Level 1–9 progression state per player (54 total levels)';
COMMENT ON TABLE xp_transactions  IS 'Immutable audit log of XP award events';
COMMENT ON COLUMN player_levels.current_tier IS '1=Novice (lv1-3), 2=Veteran (lv4-6), 3=Champion (lv7-9)';
