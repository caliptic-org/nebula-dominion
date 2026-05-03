-- Migration 007: Retention Systems
-- Login streak, daily quests, loot box awards, battle stamina

-- ============================================================
-- LOGIN STREAK
-- ============================================================

CREATE TABLE IF NOT EXISTS login_streaks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(255) NOT NULL UNIQUE,
    current_streak  INT NOT NULL DEFAULT 0,
    longest_streak  INT NOT NULL DEFAULT 0,
    -- UTC date string (YYYY-MM-DD) of the last claimed day
    last_claimed_date VARCHAR(10),
    -- Rescue tokens allow skipping 1 missed day (1 granted per week)
    rescue_tokens   INT NOT NULL DEFAULT 0,
    -- Track when the weekly rescue token was last granted
    weekly_rescue_granted_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_streaks_user_id ON login_streaks(user_id);

-- ============================================================
-- DAILY QUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS player_daily_quests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(255) NOT NULL,
    -- UTC date string (YYYY-MM-DD) for which these quests are generated
    quest_date      VARCHAR(10) NOT NULL,
    -- Quest type key (e.g. 'produce_mineral', 'win_battle', 'donate_resources', 'build_structure')
    quest_type      VARCHAR(64) NOT NULL,
    description     VARCHAR(255) NOT NULL,
    -- Target amount required (e.g. produce 200 mineral)
    target_amount   INT NOT NULL DEFAULT 1,
    -- Current progress
    progress        INT NOT NULL DEFAULT 0,
    completed       BOOLEAN NOT NULL DEFAULT FALSE,
    -- Rewards granted on completion
    xp_reward       INT NOT NULL DEFAULT 0,
    mineral_reward  INT NOT NULL DEFAULT 0,
    gas_reward      INT NOT NULL DEFAULT 0,
    energy_reward   INT NOT NULL DEFAULT 0,
    -- Whether this quest awards a loot box on full-day completion
    awards_loot_box BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, quest_date, quest_type)
);

CREATE INDEX IF NOT EXISTS idx_player_daily_quests_user_date ON player_daily_quests(user_id, quest_date);

-- ============================================================
-- LOOT BOX AWARDS
-- ============================================================

CREATE TABLE IF NOT EXISTS loot_box_awards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(255) NOT NULL,
    -- Source: 'daily_quest_complete', 'streak_day_7', etc.
    source          VARCHAR(64) NOT NULL,
    -- JSON blob of awarded items
    items           JSONB NOT NULL DEFAULT '[]',
    opened          BOOLEAN NOT NULL DEFAULT FALSE,
    opened_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loot_box_awards_user_id ON loot_box_awards(user_id);
CREATE INDEX IF NOT EXISTS idx_loot_box_awards_unopened ON loot_box_awards(user_id) WHERE opened = FALSE;

-- ============================================================
-- BATTLE STAMINA
-- Separate from the general energy resource (max 500).
-- Battle stamina: max 10, 1 regen per 20 minutes.
-- ============================================================

CREATE TABLE IF NOT EXISTS player_stamina (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(255) NOT NULL UNIQUE,
    current_stamina INT NOT NULL DEFAULT 10,
    max_stamina     INT NOT NULL DEFAULT 10,
    -- Stamina cost per battle
    cost_per_battle INT NOT NULL DEFAULT 10,
    -- Regen rate: 1 per regen_interval_minutes
    regen_interval_minutes INT NOT NULL DEFAULT 20,
    -- Timestamp of last regen tick calculation
    last_regen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_stamina_user_id ON player_stamina(user_id);
