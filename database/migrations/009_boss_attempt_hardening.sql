-- Migration 009: Boss attempt hardening (E2 fix)
--
-- Companion to apps/api/src/modules/boss/boss.service.ts. Adds:
--   1. boss_encounter_attempts.last_attack_at — wall-clock timestamp of
--      the most recent attackBoss() call. Service rejects calls
--      arriving within ATTACK_COOLDOWN_MS (500ms) of this value with
--      HTTP 429. Defangs rapid-fire damage drains even after the
--      stat-stamping fix in startAttempt.
--
--   2. boss_attempt_credits — sentinel table with UNIQUE(attempt_id)
--      WHERE kind = 'victory_credit'. Service INSERTs a single row at
--      victory time; subsequent inserts hit ON CONFLICT DO NOTHING.
--      Any future wallet-credit hook (rewards_earned → user balance)
--      can attach to this table and inherit one-shot semantics for
--      free — no double-credits on concurrent kill-shots or replays.

ALTER TABLE boss_encounter_attempts
    ADD COLUMN IF NOT EXISTS last_attack_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS boss_attempt_credits (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id  UUID NOT NULL REFERENCES boss_encounter_attempts(id) ON DELETE CASCADE,
    -- 'victory_credit' is the only kind today; column exists to keep the
    -- table reusable if we add per-mechanic loot credits later.
    kind        VARCHAR(40) NOT NULL,
    awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency lock: at most one victory_credit row per attempt. A
-- partial unique index keeps the door open for future non-victory
-- credit kinds without forcing them through the same single-shot gate.
CREATE UNIQUE INDEX IF NOT EXISTS uq_boss_attempt_credits_victory
    ON boss_attempt_credits (attempt_id)
    WHERE kind = 'victory_credit';

CREATE INDEX IF NOT EXISTS idx_boss_attempt_credits_attempt
    ON boss_attempt_credits (attempt_id);
