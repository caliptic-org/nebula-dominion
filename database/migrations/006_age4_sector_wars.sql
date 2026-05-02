-- Migration 006: Age 4 Content - Galactic Age (Levels 28-36) + Sector Wars
-- Nebula Dominion - Month 4 Development
-- Includes: Demon race units, Sector Wars tables, Leaderboard tables

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Ensure ages table exists (guard) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number      INTEGER NOT NULL UNIQUE CHECK (number BETWEEN 1 AND 6),
    name        VARCHAR(100) NOT NULL,
    theme       VARCHAR(100) NOT NULL,
    level_min   INTEGER NOT NULL,
    level_max   INTEGER NOT NULL,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT false,
    unlocked_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ages (number, name, theme, level_min, level_max, description, is_active) VALUES
(1, 'Çağ 1 - Başlangıç',      'Temel Uzay',          1,  9,  'İlk adımlar: İnsan ve Zerg temel birimleri',               true),
(2, 'Çağ 2 - Genişleme',      'Galaksi Keşfi',       10, 18, 'Yeni dünyalar: Otomatlar ırkı, 3. tür',                    false),
(3, 'Çağ 3 - Koalisyon',      'Galaktik İttifak',    19, 27, 'Güç birliği: Canavarlar ırkı, ittifak savaşları',          false),
(4, 'Çağ 4 - Galaktik',       'Galaktik Savaş',      28, 36, 'Sektör hâkimiyeti: Şeytanlar ırkı, Sector Wars',          false),
(5, 'Çağ 5 - Boyutlar Arası', 'Subspace / Boyutsal', 37, 45, 'Alternatif boyutlar: Subspace mekanikleri, Yutucu Kurt',   false),
(6, 'Çağ 6 - Kozmik',         'Evrensel Hâkimiyet',  46, 54, 'Nihai güç: Universe Master, Kozmik Konsey',               false)
ON CONFLICT (number) DO NOTHING;

-- ─── Ensure levels table exists ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS levels (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    age_id      UUID NOT NULL REFERENCES ages(id),
    number      INTEGER NOT NULL UNIQUE CHECK (number BETWEEN 1 AND 54),
    name        VARCHAR(100) NOT NULL,
    xp_required INTEGER NOT NULL,
    rewards     JSONB NOT NULL DEFAULT '{}',
    unlocks     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Age 4 levels (28-36) — Galactic Age
INSERT INTO levels (age_id, number, name, xp_required, rewards, unlocks) VALUES
(
    (SELECT id FROM ages WHERE number = 4), 28,
    'Galaktik Çağın Şafağı', 80000,
    '{"minerals": 2000, "energy": 1200, "dark_matter": 100}',
    '{"race_unlock": "demon", "sector_wars_access": true}'
),
(
    (SELECT id FROM ages WHERE number = 4), 29,
    'Şeytan Çağrısı', 90000,
    '{"minerals": 2500, "energy": 1500, "dark_matter": 120}',
    '{"unit_type": "demon_herald", "sector_map_unlock": true}'
),
(
    (SELECT id FROM ages WHERE number = 4), 30,
    'Sektör İstilası', 100000,
    '{"minerals": 3000, "energy": 1800, "dark_matter": 150, "premium_currency": 30}',
    '{"sector_attack_unlock": true, "unit_type": "chaos_brute"}'
),
(
    (SELECT id FROM ages WHERE number = 4), 31,
    'Kaos Girdabı', 112000,
    '{"minerals": 3500, "energy": 2000, "dark_matter": 180}',
    '{"unit_type": "void_revenant", "sector_bonus_multiplier": 1.05}'
),
(
    (SELECT id FROM ages WHERE number = 4), 32,
    'Galaktik Sektör Savaşı', 125000,
    '{"minerals": 4000, "energy": 2400, "dark_matter": 200, "premium_currency": 50}',
    '{"league_access": "bronze", "unit_type": "inferno_knight"}'
),
(
    (SELECT id FROM ages WHERE number = 4), 33,
    'Şeytan Ordusu', 140000,
    '{"minerals": 4500, "energy": 2800, "dark_matter": 240}',
    '{"unit_type": "demon_warlord", "league_access": "silver"}'
),
(
    (SELECT id FROM ages WHERE number = 4), 34,
    'Galaktik Korku', 158000,
    '{"minerals": 5000, "energy": 3200, "dark_matter": 280, "premium_currency": 75}',
    '{"unit_type": "doom_titan", "league_access": "gold"}'
),
(
    (SELECT id FROM ages WHERE number = 4), 35,
    'Şeytanın Tahtı', 178000,
    '{"minerals": 6000, "energy": 4000, "dark_matter": 320}',
    '{"unit_type": "abyssal_sovereign", "league_access": "platinum"}'
),
(
    (SELECT id FROM ages WHERE number = 4), 36,
    'Galaktik Hâkimiyet', 200000,
    '{"minerals": 8000, "energy": 5000, "dark_matter": 500, "premium_currency": 150, "title": "Galaktik Hâkim", "cosmetic_item": "demon_throne_banner"}',
    '{"age_completion": 4, "age5_unlock": true, "league_access": "diamond"}'
)
ON CONFLICT (number) DO NOTHING;

-- ─── Units table ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    age_id          UUID NOT NULL REFERENCES ages(id),
    level_unlock    INTEGER NOT NULL,
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    race            VARCHAR(30) NOT NULL,
    unit_type       VARCHAR(30) NOT NULL,
    tier            INTEGER NOT NULL,
    attack          INTEGER NOT NULL,
    defense         INTEGER NOT NULL,
    speed           INTEGER NOT NULL,
    hp              INTEGER NOT NULL,
    energy_cost     INTEGER NOT NULL,
    mineral_cost    INTEGER NOT NULL,
    special_ability JSONB NOT NULL DEFAULT '{}',
    subspace_bonus  JSONB NOT NULL DEFAULT '{}',
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Age 4 Demon units (5th race — kaotik/güçlü temalı)
INSERT INTO units (age_id, level_unlock, code, name, race, unit_type, tier, attack, defense, speed, hp, energy_cost, mineral_cost, special_ability, subspace_bonus, description) VALUES

-- ── Core Demon infantry ──────────────────────────────────────────────────────
(
    (SELECT id FROM ages WHERE number = 4), 28,
    'demon_herald', 'Şeytan Habercisi', 'demon', 'scout', 28,
    130, 80, 190, 1800, 200, 400,
    '{"name": "chaos_signal", "effect": "reduce_enemy_morale_10pct", "cooldown": 8}',
    '{"dark_matter_generation": 5}',
    'Düşman saflarında kaos tohumları eken hızlı şeytan habercisi'
),
(
    (SELECT id FROM ages WHERE number = 4), 29,
    'demon_chaos_brute', 'Kaos Pehlivanı', 'demon', 'infantry', 29,
    200, 150, 100, 4000, 350, 700,
    '{"name": "rampage", "effect": "attack_all_adjacent_enemies", "cooldown": 6}',
    '{"attack_chaos_bonus": 20}',
    'Her yöne saldıran kontrolsüz şeytan cengaveri'
),
(
    (SELECT id FROM ages WHERE number = 4), 30,
    'demon_void_revenant', 'Boşluk Geri Dönen', 'demon', 'infantry', 30,
    180, 120, 140, 3500, 300, 600,
    '{"name": "undying_rage", "effect": "revive_once_at_20pct_hp", "cooldown": 99}',
    '{"death_resist": true}',
    'Öldürülmesi son derece zor, bir kez geri dirilen şeytan birimi'
),
(
    (SELECT id FROM ages WHERE number = 4), 31,
    'demon_inferno_knight', 'Cehennem Şövalyesi', 'demon', 'cavalry', 31,
    260, 200, 170, 5500, 500, 1000,
    '{"name": "hellfire_charge", "effect": "burn_enemy_on_impact", "cooldown": 7}',
    '{"fire_damage_per_turn": 30}',
    'Düşmanları yakıp geçen alev zırhı giyinmiş şeytan süvari'
),
(
    (SELECT id FROM ages WHERE number = 4), 32,
    'demon_warlord', 'Şeytan Savaş Lordu', 'demon', 'commander', 32,
    320, 240, 130, 7000, 700, 1400,
    '{"name": "dark_command", "effect": "buff_all_demon_units_25pct", "cooldown": 15}',
    '{"command_aura_radius": 3}',
    'Tüm şeytan birimlerine güç aşılayan galaktik savaş komutanı'
),
(
    (SELECT id FROM ages WHERE number = 4), 33,
    'demon_doom_titan', 'Felaket Titanı', 'demon', 'titan', 33,
    450, 350, 80, 12000, 1100, 2200,
    '{"name": "apocalypse_stomp", "effect": "stun_all_nearby_enemies_2turns", "cooldown": 18}',
    '{"aoe_stomp_radius": 2}',
    'Devasa şeytan titanı, yerde yarıklar açarak yakındaki tüm düşmanları sersemletir'
),
(
    (SELECT id FROM ages WHERE number = 4), 34,
    'demon_abyssal_sorcerer', 'Uçurum Büyücüsü', 'demon', 'mage', 34,
    400, 120, 160, 4500, 900, 1800,
    '{"name": "void_curse", "effect": "halve_target_defense_for_5turns", "cooldown": 12}',
    '{"spell_power_bonus": 50}',
    'Düşmanları void büyüsüyle zayıflatan güçlü şeytan büyücüsü'
),
(
    (SELECT id FROM ages WHERE number = 4), 35,
    'demon_abyssal_sovereign', 'Uçurum Hükümdarı', 'demon', 'hero', 35,
    520, 420, 120, 15000, 1500, 3000,
    '{"name": "sovereign_dominion", "effect": "convert_one_enemy_unit", "cooldown": 25}',
    '{"sector_capture_bonus": 50}',
    'Düşman birimlerini kendine çekebilen efsanevi şeytan hükümdarı; sektör baskınlarında bonus kazanır'
),
-- Cross-race Age 4 evolution units for other races reaching Galactic Age
(
    (SELECT id FROM ages WHERE number = 4), 28,
    'human_galactic_ranger', 'Galaktik Nişancı', 'human', 'ranger', 28,
    160, 110, 180, 3000, 280, 560,
    '{"name": "precision_volley", "effect": "ignore_cover_bonus", "cooldown": 9}',
    '{"sector_vision_bonus": true}',
    'Galaktik çağda sektörlerde geniş görüş alanı kazanan insan elit nişancısı'
),
(
    (SELECT id FROM ages WHERE number = 4), 30,
    'zerg_hive_overlord', 'Kovan Efendisi', 'zerg', 'overlord', 30,
    140, 300, 60, 10000, 1200, 2400,
    '{"name": "mass_spawn", "effect": "summon_5_zerg_drones", "cooldown": 20}',
    '{"spawn_dark_matter_cost": -10}',
    'Galaktik kovan ağını yöneten zerg üst komutanı'
),
(
    (SELECT id FROM ages WHERE number = 4), 32,
    'auto_siege_constructor', 'Kuşatma İnşaatçısı', 'automaton', 'engineer', 32,
    120, 260, 70, 6000, 800, 1600,
    '{"name": "sector_fortify", "effect": "increase_sector_defense_rating_20", "cooldown": 30}',
    '{"fortification_bonus": 20}',
    'Ele geçirilen sektörleri hızla tahkim eden otomat mühendisi'
),
(
    (SELECT id FROM ages WHERE number = 4), 34,
    'monster_chaos_hydra', 'Kaos Hidrası', 'monster', 'beast', 34,
    380, 280, 130, 9000, 900, 1800,
    '{"name": "multi_strike", "effect": "attack_3_random_enemies", "cooldown": 8}',
    '{"multi_target_bonus": 30}',
    'Galaktik çağda ortaya çıkan, aynı anda üç düşmana saldıran dev canavar'
)
ON CONFLICT (code) DO NOTHING;

-- ─── Sector Wars tables ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE sector_bonus_type AS ENUM (
    'none', 'attack_boost', 'defense_boost', 'resource_bonus', 'xp_bonus', 'dark_matter_bonus'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sector_battle_status AS ENUM (
    'pending', 'in_progress', 'attacker_won', 'defender_won', 'draw'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sectors (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    VARCHAR(100) NOT NULL,
    description             TEXT,
    map_x                   INT NOT NULL,
    map_y                   INT NOT NULL,
    controlling_alliance_id UUID,
    bonus_type              sector_bonus_type NOT NULL DEFAULT 'none',
    bonus_value             INT NOT NULL DEFAULT 0,
    defense_rating          INT NOT NULL DEFAULT 100,
    is_contested            BOOLEAN NOT NULL DEFAULT FALSE,
    last_contested_at       TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sectors_coords UNIQUE (map_x, map_y)
);

CREATE TABLE IF NOT EXISTS sector_battles (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sector_id             UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    attacker_alliance_id  UUID NOT NULL,
    defender_alliance_id  UUID,
    attacker_player_id    UUID NOT NULL,
    defender_player_id    UUID,
    status                sector_battle_status NOT NULL DEFAULT 'pending',
    attacker_score        INT NOT NULL DEFAULT 0,
    defender_score        INT NOT NULL DEFAULT 0,
    units_snapshot        JSONB NOT NULL DEFAULT '{}',
    started_at            TIMESTAMPTZ,
    ended_at              TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sb_sector   ON sector_battles (sector_id);
CREATE INDEX IF NOT EXISTS idx_sb_attacker ON sector_battles (attacker_alliance_id);
CREATE INDEX IF NOT EXISTS idx_sb_status   ON sector_battles (status);

-- ─── Weekly League tables ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE league_tier AS ENUM (
    'bronze', 'silver', 'gold', 'platinum', 'diamond'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS weekly_leagues (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_number     INT NOT NULL,
    tier              league_tier NOT NULL DEFAULT 'bronze',
    starts_at         TIMESTAMPTZ NOT NULL,
    ends_at           TIMESTAMPTZ NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    prize_description TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS league_participants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id       UUID NOT NULL REFERENCES weekly_leagues(id) ON DELETE CASCADE,
    player_id       UUID NOT NULL,
    username        VARCHAR(100) NOT NULL,
    score           INT NOT NULL DEFAULT 0,
    rank            INT,
    battles_won     INT NOT NULL DEFAULT 0,
    battles_lost    INT NOT NULL DEFAULT 0,
    sector_captures INT NOT NULL DEFAULT 0,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (league_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_lp_league ON league_participants (league_id);
CREATE INDEX IF NOT EXISTS idx_lp_score  ON league_participants (league_id, score DESC);

-- ─── Seed: Galactic sector map (20 sectors, 7×7 grid) ─────────────────────────
INSERT INTO sectors (name, description, map_x, map_y, bonus_type, bonus_value, defense_rating) VALUES
    ('Alpha Nexus',       'Galaktik ticaret yollarının merkezi',         3, 3, 'resource_bonus',    25, 200),
    ('Void Rift Alpha',   'Karanlık madde enerjisi sızdıran uzay yarığı',1, 1, 'dark_matter_bonus', 30, 150),
    ('Demon Gate',        'Şeytan kuvvetlerin geçtiği kadim portal',     5, 1, 'attack_boost',      20, 180),
    ('Crimson Expanse',   'Mineral yataklarıyla dolu kırmızı nebula',    7, 1, 'resource_bonus',    20, 120),
    ('Obsidian Fortress', 'Doğal tahkimatlı asteroit kümesi',            1, 4, 'defense_boost',     25, 220),
    ('Chaos Pinnacle',    'Kaotik enerjilerin buluşma noktası',          7, 4, 'attack_boost',      15, 130),
    ('Inferno Reach',     'Birimleri hızlandıran süper sıcak plazma',   1, 7, 'xp_bonus',          20, 110),
    ('Shadow Terminus',   'Galaksi sektörünün karanlık ucu',             4, 7, 'dark_matter_bonus', 20, 140),
    ('Galactic Core',     'Büyük XP kazanımı sunan yıldız kümesi',      7, 7, 'xp_bonus',          30, 160),
    ('Pyroclast Fields',  'Ham mineral damarlarıyla yanardağ uydusu',    2, 2, 'resource_bonus',    15, 100),
    ('Dark Veil',         'Nebula tarafından gizlenmiş gizli sektör',    6, 2, 'dark_matter_bonus', 15, 120),
    ('Iron Bastion',      'Ağır zırhlı uzay istasyonu kalıntıları',      2, 6, 'defense_boost',     20, 170),
    ('Storm Front',       'Saldırı gücünü artıran elektromanyetik fırtına', 6, 6, 'attack_boost',  20, 130),
    ('Ether Crossing',    'Boyutlar arası geçiş noktası',                4, 2, 'xp_bonus',          15, 110),
    ('Stellar Graveyard', 'Yok olmuş yıldız sistemlerinin kalıntıları',  4, 5, 'none',               0, 90),
    ('Nova Flare',        'Büyük enerji sunan ölmekte olan yıldız',      2, 4, 'xp_bonus',          25, 140),
    ('Abyss Gateway',     'Galaktik uçuruma giriş noktası',              6, 4, 'dark_matter_bonus', 20, 150),
    ('Mineral Belt',      'Mineral zengini asteroit kuşağı',             3, 1, 'resource_bonus',    20, 100),
    ('Crystal Spire',     'Savunmayı güçlendiren kristal oluşumlar',     5, 7, 'defense_boost',     15, 130),
    ('Warp Nexus',        'Ele geçirildiğinde XP kazandıran warp koridoru', 5, 4, 'xp_bonus',      20, 120)
ON CONFLICT ON CONSTRAINT uq_sectors_coords DO NOTHING;

-- ─── Seed: Season 1 weekly leagues ────────────────────────────────────────────
INSERT INTO weekly_leagues (season_number, tier, starts_at, ends_at, is_active, prize_description) VALUES
    (1, 'bronze',   NOW(), NOW() + INTERVAL '7 days', TRUE, 'Bronz Lig Sezon 1 — İlk 3 nadir Şeytan birimi parçaları kazanır'),
    (1, 'silver',   NOW(), NOW() + INTERVAL '7 days', TRUE, 'Gümüş Lig Sezon 1 — İlk 3 Tier-5 Şeytan birimleri kazanır'),
    (1, 'gold',     NOW(), NOW() + INTERVAL '7 days', TRUE, 'Altın Lig Sezon 1 — İlk 3 efsanevi Boşluk Geri Dönen birimleri kazanır'),
    (1, 'platinum', NOW(), NOW() + INTERVAL '7 days', TRUE, 'Platin Lig Sezon 1 — İlk 3 sektör kontrolü bonusları kazanır'),
    (1, 'diamond',  NOW(), NOW() + INTERVAL '7 days', TRUE, 'Elmas Lig Sezon 1 — İlk 3 Galaktik Şampiyon unvanı kazanır')
ON CONFLICT DO NOTHING;
