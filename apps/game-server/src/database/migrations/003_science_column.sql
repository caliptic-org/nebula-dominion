-- Migration 003: Add science resource column to player_resources
-- Science points are earned from battles and garrisoned galaxy nodes.
-- TypeORM synchronize:true handles this automatically in dev/staging;
-- this file exists for production environments where synchronize is off.

ALTER TABLE player_resources
  ADD COLUMN IF NOT EXISTS science    NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS science_cap INTEGER       NOT NULL DEFAULT 999999;
