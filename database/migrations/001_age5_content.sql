-- Migration 001: Age 5 Content (Interdimensional, Levels 37-45)
-- Nebula Dominion - Month 5 Development

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ages table (all 6 ages defined here for reference)
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
(1, 'Çağ 1 - Başlangıç',      'Temel Uzay',         1,  9,  'İlk adımlar: İnsan ve Zerg temel birimleri',                        true),
(2, 'Çağ 2 - Genişleme',      'Galaksi Keşfi',      10, 18, 'Yeni dünyalar: Otomatlar ırkı, 3. tür',                             false),
(3, 'Çağ 3 - Koalisyon',      'Galaktik İttifak',   19, 27, 'Güç birliği: Canavarlar ırkı, ittifak savaşları',                   false),
(4, 'Çağ 4 - Galaktik',       'Galaktik Savaş',     28, 36, 'Sektör hâkimiyeti: Şeytanlar ırkı, Sector Wars',                   false),
(5, 'Çağ 5 - Boyutlar Arası', 'Subspace / Boyutsal', 37, 45, 'Alternatif boyutlar: Subspace mekanikleri, Yutucu Kurt boss',      false),
(6, 'Çağ 6 - Kozmik',         'Evrensel Hâkimiyet', 46, 54, 'Nihai güç: Universe Master, Kozmik Konsey',                        false)
ON CONFLICT (number) DO NOTHING;

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    age_id          UUID NOT NULL REFERENCES ages(id),
    number          INTEGER NOT NULL UNIQUE CHECK (number BETWEEN 1 AND 54),
    name            VARCHAR(100) NOT NULL,
    xp_required     INTEGER NOT NULL,
    rewards         JSONB NOT NULL DEFAULT '{}',
    unlocks         JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Age 5 levels (37-45)
INSERT INTO levels (age_id, number, name, xp_required, rewards, unlocks) VALUES
(
    (SELECT id FROM ages WHERE number = 5),
    37, 'Boyutsal Kapı', 185000,
    '{"minerals": 5000, "energy": 3000, "premium_currency": 50}',
    '{"unit_type": "dimensional_scout", "subspace_access": true}'
),
(
    (SELECT id FROM ages WHERE number = 5),
    38, 'Subspace Keşfi', 200000,
    '{"minerals": 6000, "energy": 4000, "premium_currency": 75}',
    '{"unit_type": "void_stalker", "subspace_zone": "alpha"}'
),
(
    (SELECT id FROM ages WHERE number = 5),
    39, 'Boyutsal Çatışma', 220000,
    '{"minerals": 7000, "energy": 5000, "premium_currency": 100}',
    '{"unit_type": "rift_cannon", "subspace_battle_mode": "pvp"}'
),
(
    (SELECT id FROM ages WHERE number = 5),
    40, 'Subspace Kalesi', 245000,
    '{"minerals": 8000, "energy": 6000, "premium_currency": 125, "cosmetic_item": "void_armor_skin"}',
    '{"unit_type": "dimension_lord", "subspace_zone": "beta"}'
),
(
    (SELECT id FROM ages WHERE number = 5),
    41, 'Alternatif Boyut', 275000,
    '{"minerals": 10000, "energy": 7500, "premium_currency": 150}',
    '{"unit_type": "phase_reaper", "subspace_zone": "gamma"}'
),
(
    (SELECT id FROM ages WHERE number = 5),
    42, 'Boyutsal Efendi', 310000,
    '{"minerals": 12000, "energy": 9000, "premium_currency": 200}',
    '{"unit_type": "void_colossus", "subspace_battle_mode": "guild"}'
),
(
    (SELECT id FROM ages WHERE number = 5),
    43, 'Kurt''un İzi', 350000,
    '{"minerals": 15000, "energy": 11000, "premium_currency": 250, "cosmetic_item": "wormhole_trail"}',
    '{"boss_encounter": "devouring_worm_phase1"}'
),
(
    (SELECT id FROM ages WHERE number = 5),
    44, 'Yutucu Nefes', 400000,
    '{"minerals": 18000, "energy": 13000, "premium_currency": 300}',
    '{"boss_encounter": "devouring_worm_phase2", "unit_type": "anti_worm_hunter"}'
),
(
    (SELECT id FROM ages WHERE number = 5),
    45, 'Boyutsal Zafer', 450000,
    '{"minerals": 25000, "energy": 20000, "premium_currency": 500, "cosmetic_item": "dimensional_throne_banner", "title": "Boyutlar Efendisi"}',
    '{"age_completion": 5, "age6_unlock": true, "boss_encounter": "devouring_worm_final"}'
)
ON CONFLICT (number) DO NOTHING;

-- Age 5 Units
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

-- Age 5 units (Interdimensional - all 5 races have subspace variants)
INSERT INTO units (age_id, level_unlock, code, name, race, unit_type, tier, attack, defense, speed, hp, energy_cost, mineral_cost, special_ability, subspace_bonus, description) VALUES
-- Human Age 5 units
(
    (SELECT id FROM ages WHERE number = 5), 37,
    'human_dimensional_scout', 'Boyutsal İzci', 'human', 'scout', 37,
    180, 120, 200, 2800, 300, 500,
    '{"name": "phase_shift", "effect": "enter_subspace_for_3_turns", "cooldown": 10}',
    '{"attack_bonus": 30, "speed_bonus": 50}',
    'İnsan ordusu için boyutlar arası keşif uzmanı'
),
(
    (SELECT id FROM ages WHERE number = 5), 38,
    'human_void_stalker', 'Boşluk Avcısı', 'human', 'infantry', 38,
    220, 160, 150, 4200, 450, 800,
    '{"name": "void_strike", "effect": "ignore_defense_30pct", "cooldown": 8}',
    '{"attack_bonus": 50}',
    'Subspace içinden saldıran elit piyade birimi'
),
(
    (SELECT id FROM ages WHERE number = 5), 39,
    'human_rift_cannon', 'Yarık Topu', 'human', 'artillery', 39,
    350, 80, 80, 5500, 700, 1200,
    '{"name": "dimensional_barrage", "effect": "aoe_damage_all_enemies", "cooldown": 15}',
    '{"range_bonus": 100, "aoe_radius": 3}',
    'Boyutsal enerjiyle çalışan uzun menzilli top'
),
(
    (SELECT id FROM ages WHERE number = 5), 40,
    'human_dimension_lord', 'Boyut Lordu', 'human', 'hero', 40,
    420, 320, 130, 8000, 1000, 2000,
    '{"name": "dimensional_sovereignty", "effect": "buff_all_friendly_30pct", "cooldown": 20}',
    '{"all_stats_bonus": 40}',
    'İnsan ordusu boyutsal komutan birimi'
),
(
    (SELECT id FROM ages WHERE number = 5), 41,
    'human_phase_reaper', 'Faz Biçici', 'human', 'assassin', 41,
    480, 100, 250, 3600, 800, 1500,
    '{"name": "phase_execute", "effect": "instant_kill_below_20pct_hp", "cooldown": 25}',
    '{"crit_bonus": 60}',
    'Boyutlar arası ışınlanarak ani öldürme gerçekleştiren suikastçı'
),
-- Zerg Age 5 units
(
    (SELECT id FROM ages WHERE number = 5), 37,
    'zerg_void_spore', 'Boşluk Sporu', 'zerg', 'infantry', 37,
    200, 100, 180, 3200, 280, 450,
    '{"name": "spore_infection", "effect": "poison_in_subspace", "cooldown": 6}',
    '{"poison_damage_bonus": 80}',
    'Subspace ortamında büyüyen zerk parazit birimi'
),
(
    (SELECT id FROM ages WHERE number = 5), 40,
    'zerg_dimensional_hive', 'Boyutsal Kovan', 'zerg', 'structure', 40,
    150, 400, 30, 15000, 1500, 3000,
    '{"name": "subspace_spawn", "effect": "spawn_units_from_subspace", "cooldown": 12}',
    '{"spawn_rate_bonus": 100}',
    'Subspace içinde birim üretebilen dev zerg yapısı'
),
-- Automaton Age 5 units
(
    (SELECT id FROM ages WHERE number = 5), 38,
    'auto_phase_drone', 'Faz Dronu', 'automaton', 'drone', 38,
    160, 180, 220, 3000, 350, 600,
    '{"name": "phase_scan", "effect": "reveal_all_subspace_units", "cooldown": 8}',
    '{"detection_bonus": 100}',
    'Boyutsal uzayı taran otomat keşif dronu'
),
(
    (SELECT id FROM ages WHERE number = 5), 42,
    'auto_void_colossus', 'Boşluk Kolossu', 'automaton', 'titan', 42,
    600, 500, 60, 20000, 2000, 4000,
    '{"name": "dimensional_crush", "effect": "massive_aoe_damage", "cooldown": 30}',
    '{"aoe_bonus": 100, "armor_pen": 50}',
    'Otomat ırkının boyutsal dev titan birimi'
),
-- Monster Age 5 units
(
    (SELECT id FROM ages WHERE number = 5), 39,
    'monster_void_beast', 'Boşluk Canavarı', 'monster', 'beast', 39,
    380, 200, 190, 7000, 600, 1100,
    '{"name": "void_hunger", "effect": "steal_hp_from_enemies", "cooldown": 10}',
    '{"life_steal_bonus": 40}',
    'Subspace enerjisiyle beslenen dev canavar'
),
-- Demon Age 5 units
(
    (SELECT id FROM ages WHERE number = 5), 41,
    'demon_rift_lord', 'Yarık Lordu', 'demon', 'lord', 41,
    550, 280, 120, 12000, 1200, 2500,
    '{"name": "rift_gate", "effect": "open_portal_teleport_army", "cooldown": 20}',
    '{"teleport_bonus": 100, "surprise_attack": true}',
    'Boyutsal kapılar açabilen şeytan komutanı'
),
(
    (SELECT id FROM ages WHERE number = 5), 44,
    'human_anti_worm_hunter', 'Kurt Avcısı', 'human', 'hero', 44,
    700, 400, 160, 15000, 1800, 3500,
    '{"name": "worm_bane", "effect": "double_damage_vs_devouring_worm", "cooldown": 15}',
    '{"boss_damage_bonus": 100}',
    'Yutucu Kurt''a karşı özelleştirilmiş elit avcı birimi'
)
ON CONFLICT (code) DO NOTHING;
