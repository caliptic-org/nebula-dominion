-- Migration: 007_resource_economy_config
-- Resource production, storage cap, and feature flag config tables for hot-reload economy system.

BEGIN;

-- Per-building production rates (replaces hardcoded BUILDING_CONFIGS constants)
CREATE TABLE IF NOT EXISTS economy_building_configs (
  id                         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  building_type              VARCHAR(50) NOT NULL UNIQUE,
  -- Base hourly production rates at Level 1, Age 1
  base_mineral_per_hour      NUMERIC(10,4) NOT NULL DEFAULT 0,
  base_gas_per_hour          NUMERIC(10,4) NOT NULL DEFAULT 0,
  base_energy_per_hour       NUMERIC(10,4) NOT NULL DEFAULT 0,
  base_population_per_hour   NUMERIC(10,4) NOT NULL DEFAULT 0,
  -- Energy consumed per hour while active (does NOT scale with level)
  energy_consumption_per_hour NUMERIC(10,4) NOT NULL DEFAULT 0,
  -- Level scaling: production = base * exponent^(level-1)
  level_scale_exponent       NUMERIC(6,4) NOT NULL DEFAULT 1.25,
  description                TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-resource storage caps with age multipliers
CREATE TABLE IF NOT EXISTS economy_storage_configs (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type     VARCHAR(20)   NOT NULL UNIQUE,  -- mineral | gas | energy | population
  base_cap          INTEGER       NOT NULL,
  -- Multipliers indexed by age (age_1..age_6); array length must be 6
  age_multipliers   NUMERIC(8,2)[] NOT NULL DEFAULT '{1, 2.5, 6, 14, 30, 60}',
  description       TEXT,
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Feature flags for A/B testing and runtime toggles
CREATE TABLE IF NOT EXISTS economy_feature_flags (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key    VARCHAR(100) NOT NULL UNIQUE,
  enabled     BOOLEAN     NOT NULL DEFAULT false,
  -- A/B variant identifier; 'control' = default behaviour
  variant     VARCHAR(50) NOT NULL DEFAULT 'control',
  -- Optional JSON payload for flag-specific parameters
  config      JSONB       NOT NULL DEFAULT '{}',
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add population columns to existing resources table
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS population          NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS population_cap      INTEGER       NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS population_per_tick NUMERIC(10,4) NOT NULL DEFAULT 0;

-- Migrate per-tick columns to NUMERIC for fractional precision
ALTER TABLE resources
  ALTER COLUMN mineral_per_tick TYPE NUMERIC(10,4) USING mineral_per_tick::NUMERIC,
  ALTER COLUMN gas_per_tick     TYPE NUMERIC(10,4) USING gas_per_tick::NUMERIC,
  ALTER COLUMN energy_per_tick  TYPE NUMERIC(10,4) USING energy_per_tick::NUMERIC;

-- Migrate resource amount columns to NUMERIC to accumulate fractions during offline calc
ALTER TABLE resources
  ALTER COLUMN mineral TYPE NUMERIC(12,4) USING mineral::NUMERIC,
  ALTER COLUMN gas     TYPE NUMERIC(12,4) USING gas::NUMERIC,
  ALTER COLUMN energy  TYPE NUMERIC(12,4) USING energy::NUMERIC;

-- ── Seed: building production configs ───────────────────────────────────────
-- Base rates at Level 1, Age 1, Tier 1 per the CAL-228 spec.
INSERT INTO economy_building_configs
  (building_type, base_mineral_per_hour, base_gas_per_hour, base_energy_per_hour,
   base_population_per_hour, energy_consumption_per_hour, level_scale_exponent, description)
VALUES
  ('command_center',   200,    0,   120,  0,  60, 1.25, 'Main base. Baseline mineral + energy income.'),
  ('mineral_extractor',1000,   0,     0,  0,  36, 1.25, 'Extracts minerals. Base 1000/hr at L1.'),
  ('gas_refinery',       0,  600,     0,  0,  48, 1.25, 'Refines gas. Base 600/hr at L1.'),
  ('solar_plant',        0,    0,   350,  0,   0, 1.25, 'Generates energy. Base 350/hr at L1.'),
  ('barracks',           0,    0,     0,  0,  96, 1.25, 'Trains infantry. Consumes energy.'),
  ('academy',            0,    0,     0,  0, 120, 1.25, 'Trains advanced units. Consumes energy.'),
  ('factory',            0,    0,     0,  0, 144, 1.25, 'Heavy mech production. High energy drain.'),
  ('spawning_pool',      0,    0,     0,  0,  72, 1.25, 'Core Zerg spawner.'),
  ('hatchery',           0,   60,     0,  0,  96, 1.25, 'Zerg expansion. Bonus gas.'),
  ('turret',             0,    0,     0,  0,  72, 1.25, 'Defensive turret.'),
  ('shield_generator',   0,    0,     0,  0, 144, 1.25, 'Base shield. High energy drain.'),
  ('nano_forge',       300,   60,     0,  0, 120, 1.25, 'Automata mineral + gas processing. Age 2.'),
  ('cyber_core',         0,    0,   300,  0, 180, 1.25, 'Automata command. High energy gen + drain.'),
  ('quantum_reactor',    0,    0,   600,  0,   0, 1.25, 'Quantum energy source. High output, no drain.'),
  ('defense_matrix',     0,    0,     0,  0, 240, 1.25, 'Area shield matrix. Very high energy drain.'),
  ('repair_drone_bay',   0,    0,     0,  0,  96, 1.25, 'Automata repair facility.')
ON CONFLICT (building_type) DO NOTHING;

-- ── Seed: storage caps ───────────────────────────────────────────────────────
-- Mineral base 24,000 = 24h production (CoC standard). Gas/Energy proportional.
INSERT INTO economy_storage_configs (resource_type, base_cap, age_multipliers, description)
VALUES
  ('mineral',    24000, '{1, 2.5, 6, 14, 30, 60}', 'Mineral storage. Base = 24h at 1000/hr.'),
  ('gas',        14400, '{1, 2.5, 6, 14, 30, 60}', 'Gas storage. Base = 24h at 600/hr.'),
  ('energy',      8400, '{1, 2.5, 6, 14, 30, 60}', 'Energy storage. Base = 24h at 350/hr.'),
  ('population',  5000, '{1, 2, 4, 8, 15, 25}',    'Population cap scales slower than other resources.')
ON CONFLICT (resource_type) DO NOTHING;

-- ── Seed: feature flags ──────────────────────────────────────────────────────
INSERT INTO economy_feature_flags (flag_key, enabled, variant, config, description)
VALUES
  ('production_rate_v2',      false, 'control', '{}',                   'A/B: new production formula for mineral extractors'),
  ('energy_soft_bottleneck',  true,  'control', '{"age_threshold": 3}', 'From Age 3, energy output intentionally below battle demand by 15%'),
  ('offline_accumulation',    true,  'control', '{}',                   'Lazy offline resource accumulation on player login'),
  ('storage_cap_curve_v2',    false, 'control', '{}',                   'A/B: alternative age multiplier curve for storage caps')
ON CONFLICT (flag_key) DO NOTHING;

-- auto-update updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_economy_building_configs_updated_at') THEN
    CREATE TRIGGER trg_economy_building_configs_updated_at
      BEFORE UPDATE ON economy_building_configs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_economy_feature_flags_updated_at') THEN
    CREATE TRIGGER trg_economy_feature_flags_updated_at
      BEFORE UPDATE ON economy_feature_flags
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

COMMIT;
