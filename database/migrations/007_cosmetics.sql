-- Migration 007: Cosmetics System
-- Kişiselleştirme ekranı için kozmetik item kataloğu ve kullanıcı envanteri

CREATE TYPE cosmetic_category AS ENUM ('skin', 'frame', 'title', 'effect');
CREATE TYPE cosmetic_rarity_type AS ENUM ('common', 'rare', 'epic', 'legendary');

CREATE TABLE IF NOT EXISTS cosmetic_items (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(200) NOT NULL,
    category      cosmetic_category NOT NULL,
    rarity        cosmetic_rarity_type NOT NULL DEFAULT 'common',
    price_gems    INTEGER CHECK (price_gems IS NULL OR price_gems > 0),
    icon          VARCHAR(50) NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    preview_image VARCHAR(500),
    is_active     BOOLEAN NOT NULL DEFAULT true,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cosmetic_items_category ON cosmetic_items(category);
CREATE INDEX idx_cosmetic_items_active   ON cosmetic_items(is_active);

-- User cosmetic ownership + equip state
-- One row per (user, cosmetic). UNIQUE ensures idempotent purchase.
CREATE TABLE IF NOT EXISTS user_cosmetics (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL,
    cosmetic_id  UUID NOT NULL REFERENCES cosmetic_items(id) ON DELETE CASCADE,
    is_equipped  BOOLEAN NOT NULL DEFAULT false,
    acquired_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, cosmetic_id)
);

CREATE INDEX idx_user_cosmetics_user     ON user_cosmetics(user_id);
CREATE INDEX idx_user_cosmetics_equipped ON user_cosmetics(user_id, is_equipped) WHERE is_equipped = true;

-- Ensure at most one equipped item per category per user (partial unique index)
CREATE UNIQUE INDEX idx_user_cosmetics_one_equipped_per_category
    ON user_cosmetics (user_id, (
        SELECT category FROM cosmetic_items WHERE id = cosmetic_id
    ))
    WHERE is_equipped = true;

-- ─── Seed: default cosmetic catalogue ────────────────────────────────────────

INSERT INTO cosmetic_items (id, name, category, rarity, price_gems, icon, description, sort_order) VALUES
  -- Skinler
  ('11111111-0001-4000-a000-000000000001', 'Standart Zırh',          'skin',   'common',    NULL, '⚔️',  'Standart komutan görünümü.',                               1),
  ('11111111-0001-4000-a000-000000000002', 'Gölge Komutan',          'skin',   'rare',      NULL, '🌑',  'Gece operasyonları için tasarlanmış stealth zırhı.',        2),
  ('11111111-0001-4000-a000-000000000003', 'Void Şövalyesi',         'skin',   'epic',       300, '🔮',  'Karanlık enerjiden oluşturulmuş destansı zırh.',            3),
  ('11111111-0001-4000-a000-000000000004', 'Kızıl Savaş Lordu',      'skin',   'legendary',  800, '🔴',  'Efsanevi Kızıl Savaşçıların gizemli zırhı.',                4),
  ('11111111-0001-4000-a000-000000000005', 'Yıldız Pilotu',          'skin',   'rare',       150, '🚀',  'Nebula uçuş kıyafeti — hafif ve aerodinamik.',              5),
  ('11111111-0001-4000-a000-000000000006', 'Arc Trooper',            'skin',   'common',    NULL, '⚡',  'Hızlı saldırı için optimize edilmiş hafif zırh.',           6),
  -- Çerçeveler
  ('11111111-0002-4000-a000-000000000001', 'Standart Çerçeve',       'frame',  'common',    NULL, '▫️',  'Minimal nebula çerçevesi.',                                 1),
  ('11111111-0002-4000-a000-000000000002', 'Nebula Sınırı',          'frame',  'rare',      NULL, '🌌',  'Yıldız gazından ilham alan mavi-mor gradient çerçeve.',     2),
  ('11111111-0002-4000-a000-000000000003', 'Plazma Devresi',         'frame',  'rare',       100, '⚡',  'Elektrik akımının izinden şekillenen endüstriyel çerçeve.', 3),
  ('11111111-0002-4000-a000-000000000004', 'Altın Mühür',            'frame',  'legendary',  600, '🏅',  'Efsanevi komutanların statüsünü simgeleyen altın çerçeve.', 4),
  ('11111111-0002-4000-a000-000000000005', 'Manga Panel',            'frame',  'epic',       250, '🖼️', 'Manga çizgi romanından fırlamış siyah-beyaz çerçeve.',      5),
  -- Unvanlar
  ('11111111-0003-4000-a000-000000000001', 'Komutan',                'title',  'common',    NULL, '🎖️', 'Standart başlangıç unvanı.',                                1),
  ('11111111-0003-4000-a000-000000000002', 'Galaksi Fatihi',         'title',  'rare',      NULL, '🌠',  'Galaksinin her köşesini dolaşmış savaşçıya verilir.',       2),
  ('11111111-0003-4000-a000-000000000003', 'Karanlık Lord',          'title',  'epic',       200, '💀',  'Karanlık güçlere hükmedenler için ayrılmış unvan.',         3),
  ('11111111-0003-4000-a000-000000000004', 'Efsanevi Savaşçı',      'title',  'legendary',  500, '🏆',  'Yalnızca tarihe geçen komutanlara tanınan efsanevi unvan.', 4),
  ('11111111-0003-4000-a000-000000000005', 'Neon Şövalye',           'title',  'rare',       120, '💡',  'Cyberpunk sokak savaşçılarının gizli lakabı.',              5),
  -- Efektler
  ('11111111-0004-4000-a000-000000000001', 'Efekt Yok',              'effect', 'common',    NULL, '○',   'Temiz, efektsiz görünüm.',                                  1),
  ('11111111-0004-4000-a000-000000000002', 'Statik Yük',             'effect', 'common',    NULL, '⚡',  'Hafif elektrostatik parçacık efekti.',                      2),
  ('11111111-0004-4000-a000-000000000003', 'Nebula Parçacıkları',   'effect', 'rare',       180, '✨',  'Mavi-mor nebula tozunu andıran yüzen parçacıklar.',         3),
  ('11111111-0004-4000-a000-000000000004', 'Karanlık Aura',          'effect', 'epic',       350, '🌑',  'Karakteri saran karanlık enerji dalgaları.',                4),
  ('11111111-0004-4000-a000-000000000005', 'Efsanevi Hale',          'effect', 'legendary',  700, '👑',  'Efsanevi statüyü gösteren altın ışık halkası.',             5)
ON CONFLICT (id) DO NOTHING;
