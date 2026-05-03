-- Migration 007: Alliance API Extensions
-- Adds gas resource to storage, application system, chat reactions, and donation log

-- ───────────── Alliance Storage: add gas column ─────────────
ALTER TABLE alliance_storage
    ADD COLUMN IF NOT EXISTS gas BIGINT NOT NULL DEFAULT 0 CHECK (gas >= 0);

-- ───────────── Alliance Applications ─────────────
CREATE TABLE IF NOT EXISTS alliance_applications (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    alliance_id   UUID        NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type          VARCHAR(20) NOT NULL DEFAULT 'request'
                    CHECK (type IN ('request', 'invite')),
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, alliance_id)
);

-- ───────────── Chat Reactions ─────────────
CREATE TABLE IF NOT EXISTS chat_reactions (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id    UUID        NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji         VARCHAR(10) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (message_id, user_id, emoji)
);

-- ───────────── Alliance Donations ─────────────
CREATE TABLE IF NOT EXISTS alliance_donations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    alliance_id   UUID        NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mineral       BIGINT      NOT NULL DEFAULT 0 CHECK (mineral >= 0),
    gas           BIGINT      NOT NULL DEFAULT 0 CHECK (gas >= 0),
    energy        BIGINT      NOT NULL DEFAULT 0 CHECK (energy >= 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────── Indexes ─────────────
CREATE INDEX IF NOT EXISTS idx_alliance_applications_alliance
    ON alliance_applications(alliance_id, status);
CREATE INDEX IF NOT EXISTS idx_alliance_applications_user
    ON alliance_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message
    ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_alliance_donations_alliance
    ON alliance_donations(alliance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alliance_donations_user
    ON alliance_donations(user_id, created_at DESC);

-- ───────────── Triggers ─────────────
CREATE TRIGGER trg_alliance_applications_updated_at
    BEFORE UPDATE ON alliance_applications
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
