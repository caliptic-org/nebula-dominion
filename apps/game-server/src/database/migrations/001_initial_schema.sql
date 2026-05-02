-- Nebula Dominion: Initial Schema
-- Run with: psql $DATABASE_URL -f migrations/001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players
CREATE TABLE IF NOT EXISTS players (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    username     VARCHAR(64) NOT NULL UNIQUE,
    elo          INTEGER     NOT NULL DEFAULT 1000,
    games_played INTEGER     NOT NULL DEFAULT 0,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Building type and status enums
DO $$ BEGIN
    CREATE TYPE building_type AS ENUM (
        'command_center',
        'mineral_extractor',
        'gas_refinery',
        'solar_plant',
        'barracks',
        'turret',
        'shield_generator'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE building_status AS ENUM (
        'constructing',
        'active',
        'destroyed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Buildings
CREATE TABLE IF NOT EXISTS buildings (
    id                       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id                UUID            NOT NULL,
    type                     building_type   NOT NULL,
    level                    INTEGER         NOT NULL DEFAULT 1,
    status                   building_status NOT NULL DEFAULT 'constructing',
    construction_started_at  TIMESTAMPTZ,
    construction_complete_at TIMESTAMPTZ,
    position_x               INTEGER         NOT NULL DEFAULT 0,
    position_y               INTEGER         NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buildings_player_id     ON buildings (player_id);
CREATE INDEX IF NOT EXISTS idx_buildings_player_status ON buildings (player_id, status);
CREATE INDEX IF NOT EXISTS idx_buildings_construction  ON buildings (status, construction_complete_at)
    WHERE status = 'constructing';

-- Resources (one row per player)
CREATE TABLE IF NOT EXISTS resources (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id         UUID        NOT NULL UNIQUE,
    mineral           INTEGER     NOT NULL DEFAULT 100,
    gas               INTEGER     NOT NULL DEFAULT 50,
    energy            INTEGER     NOT NULL DEFAULT 100,
    mineral_cap       INTEGER     NOT NULL DEFAULT 5000,
    gas_cap           INTEGER     NOT NULL DEFAULT 2000,
    energy_cap        INTEGER     NOT NULL DEFAULT 500,
    mineral_per_tick  INTEGER     NOT NULL DEFAULT 0,
    gas_per_tick      INTEGER     NOT NULL DEFAULT 0,
    energy_per_tick   INTEGER     NOT NULL DEFAULT 5,
    last_tick_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_player_id ON resources (player_id);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_players_updated_at
        BEFORE UPDATE ON players
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_buildings_updated_at
        BEFORE UPDATE ON buildings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_resources_updated_at
        BEFORE UPDATE ON resources
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
