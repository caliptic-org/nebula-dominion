-- Migration 007: Events System
-- Nebula Dominion — in-game competitive events with leaderboard and rewards

-- ───────────── Events ─────────────
CREATE TABLE IF NOT EXISTS events (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title             VARCHAR(200) NOT NULL,
    subtitle          VARCHAR(300),
    type              VARCHAR(20)  NOT NULL
                        CHECK (type IN ('tournament', 'resource', 'guild', 'special')),
    status            VARCHAR(20)  NOT NULL DEFAULT 'upcoming'
                        CHECK (status IN ('active', 'upcoming', 'archive')),
    race_color        VARCHAR(20)  NOT NULL DEFAULT '#ffffff',
    race_gradient     TEXT         NOT NULL DEFAULT 'linear-gradient(135deg, #0a0a12 0%, #07090f 100%)',
    race_label        VARCHAR(50)  NOT NULL DEFAULT '',
    description       TEXT,
    start_date        TIMESTAMPTZ  NOT NULL,
    end_date          TIMESTAMPTZ  NOT NULL,
    max_participants  INTEGER,
    top_prize         VARCHAR(200) NOT NULL DEFAULT '',
    featured          BOOLEAN      NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (end_date > start_date)
);

-- ───────────── Event Rules ─────────────
CREATE TABLE IF NOT EXISTS event_rules (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    icon       VARCHAR(10)  NOT NULL DEFAULT '📋',
    title      VARCHAR(100) NOT NULL,
    description TEXT        NOT NULL,
    sort_order SMALLINT     NOT NULL DEFAULT 0
);

-- ───────────── Event Rewards ─────────────
CREATE TABLE IF NOT EXISTS event_rewards (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rank         INTEGER      NOT NULL CHECK (rank > 0),
    prize        VARCHAR(200) NOT NULL,
    prize_detail VARCHAR(300),
    badge_type   VARCHAR(50),
    UNIQUE (event_id, rank)
);

-- ───────────── Event Participants ─────────────
CREATE TABLE IF NOT EXISTS event_participants (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score      INTEGER      NOT NULL DEFAULT 0 CHECK (score >= 0),
    joined_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

-- ───────────── Indexes ─────────────
CREATE INDEX IF NOT EXISTS idx_events_status        ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_end_date      ON events(end_date);
CREATE INDEX IF NOT EXISTS idx_event_rules_event    ON event_rules(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_rewards_event  ON event_rewards(event_id, rank);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_event_participants_user  ON event_participants(user_id);

-- ───────────── Trigger: updated_at ─────────────
CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ───────────── Seed data ─────────────
DO $$
DECLARE
    ev1 UUID; ev2 UUID; ev3 UUID; ev4 UUID; ev5 UUID; ev6 UUID;
BEGIN
    INSERT INTO events (title, subtitle, type, status, race_color, race_gradient, race_label, description, start_date, end_date, top_prize, featured)
    VALUES (
        'ZERG HAKİMİYET', 'Sezon I · Kovan Savaşları',
        'tournament', 'active',
        '#44ff44', 'linear-gradient(135deg, #003300 0%, #001800 40%, #07090f 100%)',
        'Zerg',
        'Zerg ırkının en güçlü komutanları bu sezon başlığı için çarpışıyor. Kovan zihni rehberliğinde her savaş kazanımın seni daha güçlü yapıyor.',
        NOW() - INTERVAL '3 days', NOW() + INTERVAL '2 days 14 hours',
        '10,000 Kristal', true
    ) RETURNING id INTO ev1;

    INSERT INTO events (title, subtitle, type, status, race_color, race_gradient, race_label, description, start_date, end_date, max_participants, top_prize)
    VALUES (
        'OTOMATİK IZGARA', 'Kaynak Toplanması · Sprint Modu',
        'resource', 'active',
        '#00cfff', 'linear-gradient(135deg, #001a22 0%, #000d18 40%, #07090f 100%)',
        'Otomat',
        'Elektrik maviyle parlayan otomat devleri galaksi genelinde kaynak hasat yarışında.',
        NOW() - INTERVAL '6 hours', NOW() + INTERVAL '18 hours',
        2000, '5,000 Enerji'
    ) RETURNING id INTO ev2;

    INSERT INTO events (title, subtitle, type, status, race_color, race_gradient, race_label, description, start_date, end_date, top_prize)
    VALUES (
        'NEBULA ÇATIŞMASI', 'Lonca Ligası · Grup Aşaması',
        'guild', 'active',
        '#cc00ff', 'linear-gradient(135deg, #1a0022 0%, #0d0015 40%, #07090f 100%)',
        'Şeytan',
        'Gotik rün sembolleriyle bezeli Şeytan loncaları, nebula kıyısında güç için savaşıyor.',
        NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days',
        '25,000 Kristal + Rozet'
    ) RETURNING id INTO ev3;

    INSERT INTO events (title, subtitle, type, status, race_color, race_gradient, race_label, description, start_date, end_date, top_prize)
    VALUES (
        'CANAVAR İSTİLASI', 'PvE Özel Etkinlik',
        'special', 'upcoming',
        '#ff6600', 'linear-gradient(135deg, #221000 0%, #150800 40%, #07090f 100%)',
        'Canavar',
        'Canavarlar ırkının özel etkinliği başlamak üzere. Hazırlan!',
        NOW() + INTERVAL '3 days', NOW() + INTERVAL '8 days',
        '7,500 Amber'
    ) RETURNING id INTO ev4;

    INSERT INTO events (title, subtitle, type, status, race_color, race_gradient, race_label, description, start_date, end_date, top_prize)
    VALUES (
        'İNSAN TEKNOLOJİ', 'Araştırma Yarışması',
        'resource', 'upcoming',
        '#4a9eff', 'linear-gradient(135deg, #001530 0%, #000c1e 40%, #07090f 100%)',
        'İnsan',
        'İnsan ırkının teknoloji yarışması — en hızlı araştırmacı kazanır.',
        NOW() + INTERVAL '7 days', NOW() + INTERVAL '12 days',
        '8,000 Kristal'
    ) RETURNING id INTO ev5;

    INSERT INTO events (title, subtitle, type, status, race_color, race_gradient, race_label, description, start_date, end_date, top_prize)
    VALUES (
        'KADİM SAVAŞ', 'Sezon 0 · Tamamlandı',
        'tournament', 'archive',
        '#888899', 'linear-gradient(135deg, #111118 0%, #0a0a10 100%)',
        'Tüm Irklar',
        'İlk Nebula Dominion turnuvası tamamlandı. Efsanevi bir mücadeleydi.',
        NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days',
        '50,000 Kristal'
    ) RETURNING id INTO ev6;

    -- Rules for ev1 (ZERG)
    INSERT INTO event_rules (event_id, icon, title, description, sort_order) VALUES
    (ev1, '⚔️', 'Savaş Koşulları', 'Yalnızca Zerg ırkı katılabilir. Her kazanılan PvP maçı puan verir.', 0),
    (ev1, '⏱️', 'Süre', 'Etkinlik 7 gün sürer. Son 24 saatte puan çarpanı x3 e yükselir.', 1),
    (ev1, '🧬', 'Mutasyon Bonusu', 'Mutasyon yapısı seviye 5+ ise her savaştan %20 ekstra puan kazanırsın.', 2),
    (ev1, '🚫', 'Yasaklar', 'Koordineli attack botları, exploit kullanımı tespit edilirse diskalifiye edilirsin.', 3);

    -- Rules for ev2 (OTOMAT)
    INSERT INTO event_rules (event_id, icon, title, description, sort_order) VALUES
    (ev2, '💎', 'Kaynak Takibi', 'Toplanan her 100 birim enerji 1 puan verir. Kritik kaynak nodları 5x çarpan sunar.', 0),
    (ev2, '🤖', 'Otomat Kısıtlaması', 'Yalnızca Otomat ırkı Sprint Moduna katılabilir.', 1),
    (ev2, '⚡', 'Enerji Yükü', 'Enerji kapasiteni aştığında bonus puan biriktirilir.', 2),
    (ev2, '📡', 'İletişim Protokolü', 'Grup koordinasyonu 1.5x takım çarpanı açar.', 3);

    -- Rules for ev3 (ŞEYTAN)
    INSERT INTO event_rules (event_id, icon, title, description, sort_order) VALUES
    (ev3, '🤝', 'Lonca Katılımı', 'En az 5 üyeli lonca katılabilir. Her üyenin katkısı lonca puanına eklenir.', 0),
    (ev3, '🏆', 'Lig Sistemi', 'Grup aşaması → çeyrek final → yarı final → final. Her aşama 24 saattir.', 1),
    (ev3, '💀', 'Ceza Sistemi', 'Süre dolmadan ayrılan oyuncular loncaya puan cezası yaşatır.', 2),
    (ev3, '🌌', 'Nebula Bonusu', 'Nebula bölgesinde kazanılan savaşlar 2x lonca puanı verir.', 3);

    -- Rewards for ev1
    INSERT INTO event_rewards (event_id, rank, prize, prize_detail, badge_type) VALUES
    (ev1, 1, '10,000 Kristal', 'Efsanevi Zerg Kahraman Skin', 'legendary'),
    (ev1, 2, '6,000 Kristal', 'Nadir Mutasyon Çekirdeği x3', 'rare'),
    (ev1, 3, '3,500 Kristal', 'Nadir Çekirdek x1', 'rare'),
    (ev1, 4, '2,000 Kristal', NULL, NULL),
    (ev1, 5, '1,200 Kristal', NULL, NULL),
    (ev1, 6, '800 Kristal', NULL, NULL),
    (ev1, 7, '500 Kristal', NULL, NULL),
    (ev1, 8, '300 Kristal', NULL, NULL),
    (ev1, 9, '200 Kristal', NULL, NULL),
    (ev1, 10, '100 Kristal', NULL, NULL);

    -- Rewards for ev2
    INSERT INTO event_rewards (event_id, rank, prize, prize_detail, badge_type) VALUES
    (ev2, 1, '5,000 Enerji', 'Efsanevi Grid Core Modülü', 'legendary'),
    (ev2, 2, '3,000 Enerji', 'Hologram Paketi x2', 'rare'),
    (ev2, 3, '1,800 Enerji', 'Gelişmiş Çip x3', 'uncommon'),
    (ev2, 4, '1,000 Enerji', NULL, NULL),
    (ev2, 5, '600 Enerji', NULL, NULL);

    -- Rewards for ev3
    INSERT INTO event_rewards (event_id, rank, prize, prize_detail, badge_type) VALUES
    (ev3, 1, '25,000 Kristal', 'Lonca Rozeti + Efsanevi Banner', 'legendary'),
    (ev3, 2, '15,000 Kristal', 'Nadir Lonca Rozeti', 'rare'),
    (ev3, 3, '8,000 Kristal', 'Bronz Lonca Rozeti', 'uncommon'),
    (ev3, 4, '4,000 Kristal', NULL, NULL),
    (ev3, 5, '2,000 Kristal', NULL, NULL);

    -- Rewards for ev6 (archive)
    INSERT INTO event_rewards (event_id, rank, prize, prize_detail, badge_type) VALUES
    (ev6, 1, '50,000 Kristal', 'Efsanevi Sezon 0 Rozeti', 'legendary'),
    (ev6, 2, '30,000 Kristal', 'Nadir Sezon 0 Rozeti', 'rare'),
    (ev6, 3, '15,000 Kristal', NULL, NULL);

    -- Leaderboard seed: fake participants for ev1 (using a placeholder user lookup)
    -- Real participants are created via /join endpoint at runtime

END $$;
