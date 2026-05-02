-- Nebula Dominion: Units System Migration
-- Run with: psql $DATABASE_URL -f migrations/002_units_system.sql

-- ─── Enum: unit_type ──────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE unit_type AS ENUM (
        'marine',
        'medic',
        'siege_tank',
        'ghost',
        'zergling',
        'hydralisk',
        'ultralisk',
        'queen'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Enum: race ───────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE race AS ENUM (
        'human',
        'zerg',
        'automaton'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Extend building_type enum with race-specific buildings ───────────────────
-- Only add values that do not already exist
DO $$ BEGIN
    ALTER TYPE building_type ADD VALUE IF NOT EXISTS 'spawning_pool';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE building_type ADD VALUE IF NOT EXISTS 'hatchery';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE building_type ADD VALUE IF NOT EXISTS 'factory';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE building_type ADD VALUE IF NOT EXISTS 'academy';
EXCEPTION WHEN others THEN NULL; END $$;

-- ─── Table: player_units ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_units (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id   UUID        NOT NULL,
    type        unit_type   NOT NULL,
    race        race        NOT NULL,
    hp          INTEGER     NOT NULL,
    max_hp      INTEGER     NOT NULL,
    attack      INTEGER     NOT NULL,
    defense     INTEGER     NOT NULL,
    speed       INTEGER     NOT NULL,
    position_x  INTEGER     NOT NULL DEFAULT 0,
    position_y  INTEGER     NOT NULL DEFAULT 0,
    abilities   JSONB       NOT NULL DEFAULT '[]',
    is_alive    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_units_player_id        ON player_units (player_id);
CREATE INDEX IF NOT EXISTS idx_player_units_player_alive     ON player_units (player_id, is_alive);
CREATE INDEX IF NOT EXISTS idx_player_units_alive            ON player_units (is_alive) WHERE is_alive = TRUE;

-- ─── Table: training_queue ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_queue (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id    UUID        NOT NULL,
    building_id  UUID        NOT NULL,
    unit_type    unit_type   NOT NULL,
    race         race        NOT NULL,
    completes_at TIMESTAMPTZ NOT NULL,
    is_complete  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_queue_player_id      ON training_queue (player_id);
CREATE INDEX IF NOT EXISTS idx_training_queue_player_pending ON training_queue (player_id, is_complete) WHERE is_complete = FALSE;
CREATE INDEX IF NOT EXISTS idx_training_queue_overdue        ON training_queue (completes_at, is_complete) WHERE is_complete = FALSE;

-- ─── Trigger: auto-update updated_at on player_units ─────────────────────────
DO $$ BEGIN
    CREATE TRIGGER trg_player_units_updated_at
        BEFORE UPDATE ON player_units
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
