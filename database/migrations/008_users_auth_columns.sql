-- Migration 008: Auth columns on users table (CAL-303)
-- Adds is_active and last_login_at columns required by the JWT auth pipeline
-- introduced in CAL-286. The original users schema in init-db.sql only had
-- is_banned, which the auth code does not consult; logins / refresh tokens /
-- /auth/me look up users with isActive=true.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
