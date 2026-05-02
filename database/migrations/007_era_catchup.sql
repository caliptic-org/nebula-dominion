-- Migration: Era Catch-up System (CAL-201)
-- Creates the era_packages table to track era transition rewards granted to players.

CREATE TABLE IF NOT EXISTS era_packages (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                      VARCHAR(255) NOT NULL,
    from_age                     INT NOT NULL,
    to_age                       INT NOT NULL,
    gold_granted                 INT NOT NULL DEFAULT 0,
    gems_granted                 INT NOT NULL DEFAULT 0,
    premium_currency_granted     INT NOT NULL DEFAULT 0,
    unit_pack_count              INT NOT NULL DEFAULT 0,
    production_boost_multiplier  NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    production_boost_expires_at  TIMESTAMPTZ,
    granted_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One catch-up package per player per era transition
    CONSTRAINT uq_era_packages_user_to_age UNIQUE (user_id, to_age)
);

CREATE INDEX idx_era_packages_user_id ON era_packages (user_id);
CREATE INDEX idx_era_packages_boost_expires ON era_packages (user_id, production_boost_expires_at)
    WHERE production_boost_expires_at IS NOT NULL;

COMMENT ON TABLE era_packages IS
    'Records era catch-up packages granted on age transitions. '
    'Each player receives one package per age. '
    'The production_boost_expires_at tracks the 24h x2 production boost window.';
