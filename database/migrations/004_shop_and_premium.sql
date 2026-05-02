-- Migration 004: Shop Items, Premium Pass, Transactions
-- In-game mağaza, kozmetik itemler, premium pass, ödeme entegrasyonu

-- In-game currencies
CREATE TABLE IF NOT EXISTS user_currency (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE,
    nebula_coins        INTEGER NOT NULL DEFAULT 0 CHECK (nebula_coins >= 0),
    void_crystals       INTEGER NOT NULL DEFAULT 0 CHECK (void_crystals >= 0),
    premium_gems        INTEGER NOT NULL DEFAULT 0 CHECK (premium_gems >= 0),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_currency_user ON user_currency(user_id);

-- Shop item categories
CREATE TYPE shop_item_category AS ENUM (
    'cosmetic_skin',
    'cosmetic_banner',
    'cosmetic_avatar_frame',
    'cosmetic_trail',
    'cosmetic_chat_bubble',
    'resource_pack',
    'unit_boost',
    'premium_pass',
    'battle_pass_tier_skip',
    'xp_booster',
    'currency_bundle'
);

-- Shop items
CREATE TABLE IF NOT EXISTS shop_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku             VARCHAR(100) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    category        shop_item_category NOT NULL,
    rarity          VARCHAR(20) NOT NULL DEFAULT 'common'
                    CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    price_nebula_coins  INTEGER,
    price_void_crystals INTEGER,
    price_premium_gems  INTEGER,
    price_real_usd      NUMERIC(10,2),
    price_real_try      NUMERIC(10,2),
    content         JSONB NOT NULL DEFAULT '{}',
    preview_asset   VARCHAR(500),
    is_limited      BOOLEAN NOT NULL DEFAULT false,
    limited_stock   INTEGER,
    stock_remaining INTEGER,
    available_from  TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    age_required    INTEGER,
    level_required  INTEGER,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_items_category ON shop_items(category);
CREATE INDEX idx_shop_items_active ON shop_items(is_active);
CREATE INDEX idx_shop_items_rarity ON shop_items(rarity);

-- Seed shop items
INSERT INTO shop_items (sku, name, description, category, rarity, price_nebula_coins, price_void_crystals, price_premium_gems, price_real_usd, price_real_try, content, is_limited, age_required, level_required, tags) VALUES
-- Cosmetic skins
('skin_void_armor', 'Boşluk Zırhı', 'Subspace''den çıkmış mistik zırh görünümü', 'cosmetic_skin', 'epic', NULL, 300, 150, 9.99, 349.99, '{"unit_skin": "void_armor", "applies_to": "all_human_units"}', false, 5, 38, ARRAY['subspace', 'age5', 'human']),
('skin_worm_slayer', 'Kurt Katili Zırhı', 'Yutucu Kurt''u yenenlere özel zırh', 'cosmetic_skin', 'legendary', NULL, 1000, NULL, NULL, NULL, '{"unit_skin": "worm_slayer_armor", "applies_to": "all_units", "effect": "glowing_worm_aura"}', true, 5, 45, ARRAY['boss', 'legendary', 'exclusive', 'age5']),
('skin_dimensional_throne', 'Boyutsal Taht', 'Çağ 5 tamamlama ödülü - özel banner', 'cosmetic_banner', 'legendary', NULL, NULL, NULL, NULL, NULL, '{"banner_skin": "dimensional_throne", "animated": true}', true, 5, 45, ARRAY['age5_completion', 'legendary']),

-- Avatar frames
('frame_subspace_explorer', 'Subspace Kaşifi Çerçevesi', 'Subspace''e 10 kez giren oyunculara', 'cosmetic_avatar_frame', 'rare', 500, NULL, NULL, 2.99, 99.99, '{"frame": "subspace_explorer", "animated": false}', false, 5, 37, ARRAY['subspace', 'age5']),
('frame_worm_hunter', 'Worm Avcısı Çerçevesi', 'Animasyonlu Kurt figürlü çerçeve', 'cosmetic_avatar_frame', 'epic', NULL, 200, 80, 4.99, 179.99, '{"frame": "worm_hunter", "animated": true, "animation": "worm_circling"}', false, 5, 43, ARRAY['boss', 'animated', 'age5']),

-- Trails
('trail_void_wormhole', 'Boyutsal Solucan Deliği İzi', 'Hareket ederken bırakılan renkli boyutsal iz', 'cosmetic_trail', 'epic', NULL, 150, 75, 4.99, 169.99, '{"trail": "void_wormhole", "color": "purple_teal", "duration_secs": 3}', false, 5, 38, ARRAY['trail', 'subspace', 'age5']),
('trail_worm_scales', 'Kurt Pulu İzi', 'Yutucu Kurt pullarından yapılmış iz', 'cosmetic_trail', 'legendary', NULL, 500, NULL, 12.99, 449.99, '{"trail": "worm_scales", "animated": true, "particle_effect": "worm_scales_falling"}', true, 5, 44, ARRAY['trail', 'boss', 'legendary']),

-- Resource packs
('resource_age5_starter', 'Çağ 5 Başlangıç Paketi', '10.000 Mineral, 8.000 Enerji, 100 Void Crystal', 'resource_pack', 'uncommon', NULL, NULL, 50, 2.99, 99.99, '{"minerals": 10000, "energy": 8000, "void_crystals": 100}', false, 5, 37, ARRAY['resources', 'age5', 'starter']),
('resource_worm_raid_kit', 'Yutucu Kurt Baskın Kiti', '50.000 Mineral, 30.000 Enerji, 500 Void Crystal, 3x XP Booster', 'resource_pack', 'rare', NULL, NULL, 200, 9.99, 349.99, '{"minerals": 50000, "energy": 30000, "void_crystals": 500, "xp_booster_count": 3}', false, 5, 43, ARRAY['resources', 'boss', 'raid']),

-- XP boosters
('xp_boost_1h', '1 Saatlik XP Artışı (2x)', '1 saat boyunca 2x XP kazan', 'xp_booster', 'common', 100, NULL, 20, 0.99, 34.99, '{"multiplier": 2.0, "duration_minutes": 60}', false, NULL, NULL, ARRAY['boost', 'xp']),
('xp_boost_24h', '24 Saatlik XP Artışı (2x)', '24 saat boyunca 2x XP kazan', 'xp_booster', 'uncommon', 800, NULL, 150, 4.99, 179.99, '{"multiplier": 2.0, "duration_minutes": 1440}', false, NULL, NULL, ARRAY['boost', 'xp', 'daily']),

-- Unit boosts
('unit_boost_age5', 'Çağ 5 Birim Güçlendirme', 'Çağ 5 birimlerin gücünü 24 saat %20 artır', 'unit_boost', 'uncommon', NULL, 100, 50, 2.99, 99.99, '{"age": 5, "stat_bonus_pct": 20, "duration_hours": 24}', false, 5, 37, ARRAY['boost', 'unit', 'age5']),

-- Currency bundles (Stripe/iyzico ile satın alınanlar)
('gems_100', '100 Premium Gem', 'Nadir itemlar için premium para birimi', 'currency_bundle', 'common', NULL, NULL, NULL, 0.99, 34.99, '{"premium_gems": 100}', false, NULL, NULL, ARRAY['currency', 'gems']),
('gems_550', '500+50 Premium Gem', 'Bonus %10 hediyeli paket', 'currency_bundle', 'uncommon', NULL, NULL, NULL, 4.99, 179.99, '{"premium_gems": 550}', false, NULL, NULL, ARRAY['currency', 'gems', 'bonus']),
('gems_1200', '1000+200 Premium Gem', 'Bonus %20 hediyeli büyük paket', 'currency_bundle', 'rare', NULL, NULL, NULL, 9.99, 349.99, '{"premium_gems": 1200}', false, NULL, NULL, ARRAY['currency', 'gems', 'bonus', 'popular']),
('gems_2800', '2000+800 Premium Gem', 'Bonus %40 hediyeli dev paket', 'currency_bundle', 'epic', NULL, NULL, NULL, 19.99, 699.99, '{"premium_gems": 2800}', false, NULL, NULL, ARRAY['currency', 'gems', 'bonus', 'value']),
('gems_6500', '5000+1500 Premium Gem', 'En iyi değer - Bonus %30', 'currency_bundle', 'legendary', NULL, NULL, NULL, 49.99, 1749.99, '{"premium_gems": 6500}', false, NULL, NULL, ARRAY['currency', 'gems', 'best_value'])
ON CONFLICT (sku) DO NOTHING;

-- Premium Pass definitions
CREATE TABLE IF NOT EXISTS premium_passes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    pass_type       VARCHAR(30) NOT NULL CHECK (pass_type IN ('monthly', 'season', 'annual', 'battle_pass')),
    duration_days   INTEGER NOT NULL,
    price_usd       NUMERIC(10,2) NOT NULL,
    price_try       NUMERIC(10,2) NOT NULL,
    features        JSONB NOT NULL DEFAULT '[]',
    rewards         JSONB NOT NULL DEFAULT '{}',
    tier_rewards    JSONB NOT NULL DEFAULT '[]',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO premium_passes (code, name, description, pass_type, duration_days, price_usd, price_try, features, rewards, tier_rewards) VALUES
(
    'monthly_pass',
    'Aylık Premium Geçiş',
    '30 gün premium avantajlar: 2x kaynak, reklamsız, özel kozmetikler',
    'monthly', 30, 4.99, 179.99,
    '[
        "2x kaynak üretimi",
        "2x XP kazanımı",
        "Özel premium avatar çerçevesi",
        "Reklamsız oyun deneyimi",
        "Günlük 50 bonus Nebula Coin",
        "Premium destek önceliği"
    ]',
    '{"daily_nebula_coins": 50, "resource_multiplier": 2.0, "xp_multiplier": 2.0, "cosmetic": "premium_monthly_frame"}',
    '[]'
),
(
    'battle_pass_season5',
    'Sezon 5 Battle Pass - Boyutlar Savaşı',
    'Çağ 5 temalı 50 tier ödüllü battle pass',
    'battle_pass', 90, 9.99, 349.99,
    '[
        "50 tier ödül yolu",
        "Özel Çağ 5 kozmetikler",
        "Void Crystal ödülleri",
        "Özel boss skin açma şansı",
        "3x XP hafta sonları"
    ]',
    '{"tier_count": 50, "base_rewards": {"void_crystals": 100}}',
    '[
        {"tier": 1, "reward": {"type": "void_crystals", "amount": 50}},
        {"tier": 5, "reward": {"type": "cosmetic", "sku": "frame_subspace_explorer"}},
        {"tier": 10, "reward": {"type": "currency", "nebula_coins": 500}},
        {"tier": 15, "reward": {"type": "resource_pack", "minerals": 10000, "energy": 8000}},
        {"tier": 20, "reward": {"type": "cosmetic", "sku": "trail_void_wormhole"}},
        {"tier": 25, "reward": {"type": "void_crystals", "amount": 200}},
        {"tier": 30, "reward": {"type": "xp_booster", "hours": 24}},
        {"tier": 35, "reward": {"type": "cosmetic", "sku": "frame_worm_hunter"}},
        {"tier": 40, "reward": {"type": "unit_unlock", "unit_code": "human_dimension_lord"}},
        {"tier": 45, "reward": {"type": "cosmetic", "sku": "skin_void_armor"}},
        {"tier": 50, "reward": {"type": "cosmetic", "sku": "trail_worm_scales", "title": "Boyutsal Savaşçı"}}
    ]'
),
(
    'annual_pass',
    'Yıllık Premium Geçiş',
    '365 gün premium avantajlar - en ekonomik seçim',
    'annual', 365, 39.99, 1399.99,
    '[
        "Tüm aylık premium avantajlar",
        "3x kaynak üretimi",
        "3x XP kazanımı",
        "Özel yıllık kozmetik set",
        "Günlük 100 bonus Nebula Coin",
        "Tüm sezon battle pass''ler dahil",
        "VIP oyuncu rozeti"
    ]',
    '{"daily_nebula_coins": 100, "resource_multiplier": 3.0, "xp_multiplier": 3.0, "cosmetic_set": "annual_vip_set", "includes_battle_passes": true}',
    '[]'
)
ON CONFLICT (code) DO NOTHING;

-- User premium pass subscriptions
CREATE TABLE IF NOT EXISTS user_premium_passes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL,
    premium_pass_id     UUID NOT NULL REFERENCES premium_passes(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,
    auto_renew          BOOLEAN NOT NULL DEFAULT false,
    current_tier        INTEGER NOT NULL DEFAULT 0,
    tier_xp             INTEGER NOT NULL DEFAULT 0,
    claimed_rewards     JSONB NOT NULL DEFAULT '[]',
    payment_provider    VARCHAR(20),
    subscription_id     VARCHAR(200),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_premium_passes_user ON user_premium_passes(user_id);
CREATE INDEX idx_user_premium_passes_status ON user_premium_passes(status);
CREATE INDEX idx_user_premium_passes_expires ON user_premium_passes(expires_at);

-- User inventory (satın alınan itemler)
CREATE TABLE IF NOT EXISTS user_inventory (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL,
    shop_item_id    UUID NOT NULL REFERENCES shop_items(id),
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    acquired_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source          VARCHAR(30) NOT NULL DEFAULT 'purchase'
                    CHECK (source IN ('purchase', 'battle_pass', 'achievement', 'gift', 'event')),
    is_equipped     BOOLEAN NOT NULL DEFAULT false,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, shop_item_id)
);

CREATE INDEX idx_user_inventory_user ON user_inventory(user_id);
CREATE INDEX idx_user_inventory_item ON user_inventory(shop_item_id);
