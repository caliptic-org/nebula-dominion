-- Nebula Dominion - PostgreSQL 16 Schema Init
-- Runs automatically on first postgres startup via docker-entrypoint-initdb.d

-- ───────────── Extensions ─────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ───────────── Users ─────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    elo_rating      INTEGER     NOT NULL DEFAULT 1000,
    total_games     INTEGER     NOT NULL DEFAULT 0,
    wins            INTEGER     NOT NULL DEFAULT 0,
    losses          INTEGER     NOT NULL DEFAULT 0,
    draws           INTEGER     NOT NULL DEFAULT 0,
    race            VARCHAR(20) CHECK (race IN ('human', 'zerg', 'automaton', 'beast', 'demon')),
    current_age     SMALLINT    NOT NULL DEFAULT 1 CHECK (current_age BETWEEN 1 AND 6),
    current_level   SMALLINT    NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 9),
    premium_until   TIMESTAMPTZ,
    is_banned       BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────── Refresh Tokens ─────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────── Unit Definitions ─────────────
CREATE TABLE IF NOT EXISTS unit_definitions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    race            VARCHAR(20)  NOT NULL CHECK (race IN ('human', 'zerg', 'automaton', 'beast', 'demon')),
    age             SMALLINT     NOT NULL CHECK (age BETWEEN 1 AND 6),
    tier            SMALLINT     NOT NULL CHECK (tier BETWEEN 1 AND 9),
    base_health     INTEGER      NOT NULL,
    base_attack     INTEGER      NOT NULL,
    base_defense    INTEGER      NOT NULL,
    base_speed      INTEGER      NOT NULL,
    can_merge       BOOLEAN      NOT NULL DEFAULT FALSE,
    can_mutate      BOOLEAN      NOT NULL DEFAULT FALSE,
    description     TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (name, race)
);

-- ───────────── Game Sessions ─────────────
CREATE TABLE IF NOT EXISTS game_sessions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id          UUID        NOT NULL REFERENCES users(id),
    player2_id          UUID        NOT NULL REFERENCES users(id),
    winner_id           UUID        REFERENCES users(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'active', 'completed', 'abandoned')),
    player1_race        VARCHAR(20) NOT NULL CHECK (player1_race IN ('human', 'zerg', 'automaton', 'beast', 'demon')),
    player2_race        VARCHAR(20) NOT NULL CHECK (player2_race IN ('human', 'zerg', 'automaton', 'beast', 'demon')),
    player1_elo_before  INTEGER     NOT NULL,
    player2_elo_before  INTEGER     NOT NULL,
    player1_elo_after   INTEGER,
    player2_elo_after   INTEGER,
    duration_seconds    INTEGER,
    round_count         INTEGER     NOT NULL DEFAULT 0,
    started_at          TIMESTAMPTZ,
    ended_at            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────── Matchmaking Queue ─────────────
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(id) UNIQUE,
    elo_rating          INTEGER     NOT NULL,
    elo_range           INTEGER     NOT NULL DEFAULT 100,
    status              VARCHAR(20) NOT NULL DEFAULT 'waiting'
                            CHECK (status IN ('waiting', 'matched', 'cancelled')),
    matched_session_id  UUID        REFERENCES game_sessions(id),
    joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────── Indexes ─────────────
CREATE INDEX IF NOT EXISTS idx_users_elo            ON users(elo_rating);
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active      ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_game_sessions_p1     ON game_sessions(player1_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_p2     ON game_sessions(player2_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_matchmaking_status   ON matchmaking_queue(status, elo_rating);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user  ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_defs_race       ON unit_definitions(race, age, tier);

-- ───────────── Auto-update updated_at ─────────────
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_matchmaking_updated_at
    BEFORE UPDATE ON matchmaking_queue
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
