-- Migration: 002_progression_full_54_levels
-- Extends progression system from Age 1-2 (levels 1-18) to Age 1-6 (levels 1-54).
-- Adds XP threshold config table (hot-reload), XP source telemetry table,
-- and fixes player_levels constraints.

-- ─── Fix player_levels constraints ───────────────────────────────────────────
ALTER TABLE player_levels
  DROP CONSTRAINT IF EXISTS player_levels_level_range,
  DROP CONSTRAINT IF EXISTS player_levels_tier_range;

ALTER TABLE player_levels
  ADD CONSTRAINT player_levels_level_range CHECK (current_level BETWEEN 1 AND 54),
  ADD CONSTRAINT player_levels_tier_range  CHECK (current_tier  BETWEEN 1 AND 18);

-- Update comment to reflect full 54-level design
COMMENT ON COLUMN player_levels.current_tier IS
  '1-3=Age1, 4-6=Age2, 7-9=Age3, 10-12=Age4, 13-15=Age5, 16-18=Age6 (3 tiers per age)';

-- ─── xp_threshold_config ─────────────────────────────────────────────────────
-- Stores per-age XP thresholds. active=true rows override compiled defaults
-- (ProgressionConfigService.reloadFromDb). Allows hot-reload without redeploy.
CREATE TABLE IF NOT EXISTS xp_threshold_config (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    age            INT          NOT NULL,
    xp_start       INT          NOT NULL,
    xp_end         INT          NOT NULL,
    f2p_days_from  INT          NOT NULL,
    f2p_days_to    INT          NOT NULL,
    active         BOOLEAN      NOT NULL DEFAULT true,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by     VARCHAR(255),

    CONSTRAINT xp_threshold_config_age_range CHECK (age BETWEEN 1 AND 6),
    CONSTRAINT xp_threshold_config_xp_order  CHECK (xp_end > xp_start),
    CONSTRAINT xp_threshold_config_days_order CHECK (f2p_days_to >= f2p_days_from),
    CONSTRAINT xp_threshold_config_age_unique UNIQUE (age)
);

COMMENT ON TABLE  xp_threshold_config           IS 'Hot-reloadable per-age XP threshold overrides';
COMMENT ON COLUMN xp_threshold_config.active    IS 'Only active=true rows are loaded by ProgressionConfigService';
COMMENT ON COLUMN xp_threshold_config.xp_start  IS 'Cumulative total XP to enter this age';
COMMENT ON COLUMN xp_threshold_config.xp_end    IS 'Cumulative total XP to complete this age';

-- Seed canonical thresholds from CAL-230 design doc
INSERT INTO xp_threshold_config (age, xp_start, xp_end, f2p_days_from, f2p_days_to, active, updated_by)
VALUES
  (1,       0,    5500,   1,   3, true, 'migration_002'),
  (2,    5500,   18000,   4,  10, true, 'migration_002'),
  (3,   18000,   52000,  11,  30, true, 'migration_002'),
  (4,   52000,  145000,  31,  65, true, 'migration_002'),
  (5,  145000,  380000,  66, 110, true, 'migration_002'),
  (6,  380000,  950000, 111, 150, true, 'migration_002')
ON CONFLICT (age) DO UPDATE SET
  xp_start      = EXCLUDED.xp_start,
  xp_end        = EXCLUDED.xp_end,
  f2p_days_from = EXCLUDED.f2p_days_from,
  f2p_days_to   = EXCLUDED.f2p_days_to,
  updated_at    = NOW(),
  updated_by    = EXCLUDED.updated_by;

-- ─── xp_source_telemetry ─────────────────────────────────────────────────────
-- Append-only XP source breakdown event log for real-time F2P progression
-- calibration. Each row is one XP award event with source tagging.
CREATE TABLE IF NOT EXISTS xp_source_telemetry (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       VARCHAR(255) NOT NULL,
    source        VARCHAR(64)  NOT NULL,
    base_amount   INT          NOT NULL,
    final_amount  INT          NOT NULL,
    current_level INT          NOT NULL,
    current_age   INT          NOT NULL,
    total_xp      INT          NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT xp_source_telemetry_base_pos  CHECK (base_amount  > 0),
    CONSTRAINT xp_source_telemetry_final_pos CHECK (final_amount > 0),
    CONSTRAINT xp_source_telemetry_level_rng CHECK (current_level BETWEEN 1 AND 54),
    CONSTRAINT xp_source_telemetry_age_rng   CHECK (current_age   BETWEEN 1 AND 6)
);

-- Indexes for F2P rate analytics and source breakdown queries
CREATE INDEX IF NOT EXISTS idx_xp_tel_user_time   ON xp_source_telemetry (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_tel_source_time ON xp_source_telemetry (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_tel_age_source  ON xp_source_telemetry (current_age, source);

COMMENT ON TABLE xp_source_telemetry IS
  'XP source breakdown telemetry for real-time F2P progression rate monitoring';

-- ─── age_transitions ─────────────────────────────────────────────────────────
-- Records each age transition event for funnel analytics and badge assignment audit.
CREATE TABLE IF NOT EXISTS age_transitions (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           VARCHAR(255) NOT NULL,
    previous_age      INT          NOT NULL,
    new_age           INT          NOT NULL,
    total_xp          INT          NOT NULL,
    new_badge_tier    VARCHAR(32)  NOT NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT age_transitions_age_range     CHECK (previous_age BETWEEN 1 AND 6),
    CONSTRAINT age_transitions_new_age_range CHECK (new_age       BETWEEN 2 AND 6),
    CONSTRAINT age_transitions_xp_pos        CHECK (total_xp >= 0)
);

CREATE INDEX IF NOT EXISTS idx_age_trans_user    ON age_transitions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_age_trans_age     ON age_transitions (new_age, created_at DESC);

COMMENT ON TABLE age_transitions IS
  'Audit log of player age transition events with badge tier assignment';

-- ─── Grafana helper view: daily XP by source ─────────────────────────────────
-- Used by the game-metrics Grafana dashboard for F2P calibration monitoring.
CREATE OR REPLACE VIEW v_daily_xp_by_source AS
SELECT
    DATE(created_at AT TIME ZONE 'UTC') AS day,
    source,
    current_age,
    COUNT(*)                             AS event_count,
    SUM(final_amount)                    AS total_xp,
    ROUND(AVG(final_amount), 1)          AS avg_xp_per_event
FROM xp_source_telemetry
GROUP BY DATE(created_at AT TIME ZONE 'UTC'), source, current_age;

COMMENT ON VIEW v_daily_xp_by_source IS
  'Daily XP breakdown by source and age — used for F2P progression calibration';
