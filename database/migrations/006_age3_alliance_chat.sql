-- Migration 006: Age 3 Content (Coalition, Levels 19-27), Alliance System, and Chat
-- Nebula Dominion - Month 3 Development

-- ───────────── Age 3 Levels (19-27) ─────────────
INSERT INTO levels (age_id, number, name, xp_required, rewards, unlocks) VALUES
(
    (SELECT id FROM ages WHERE number = 3),
    19, 'İttifakın Şafağı', 55000,
    '{"minerals": 2000, "energy": 1200, "premium_currency": 20}',
    '{"race_unlock": "monster", "feature": "alliance_system"}'
),
(
    (SELECT id FROM ages WHERE number = 3),
    20, 'Güç Birliği', 62000,
    '{"minerals": 2400, "energy": 1500, "premium_currency": 25}',
    '{"unit_type": "monster_vine_creeper", "alliance_feature": "alliance_depot"}'
),
(
    (SELECT id FROM ages WHERE number = 3),
    21, 'Koalisyon Kuruluşu', 70000,
    '{"minerals": 2800, "energy": 1800, "premium_currency": 30}',
    '{"unit_type": "monster_bone_crusher", "alliance_feature": "alliance_members_10"}'
),
(
    (SELECT id FROM ages WHERE number = 3),
    22, 'İlk Savaş', 80000,
    '{"minerals": 3200, "energy": 2100, "premium_currency": 35}',
    '{"unit_type": "monster_pack_hunter", "alliance_feature": "alliance_war"}'
),
(
    (SELECT id FROM ages WHERE number = 3),
    23, 'Savaş Üssü', 92000,
    '{"minerals": 3600, "energy": 2400, "premium_currency": 40}',
    '{"unit_type": "monster_toxic_spitter", "alliance_feature": "alliance_channel"}'
),
(
    (SELECT id FROM ages WHERE number = 3),
    24, 'Koalisyon Saldırısı', 106000,
    '{"minerals": 4000, "energy": 2800, "premium_currency": 45}',
    '{"unit_type": "monster_stone_golem", "alliance_feature": "alliance_members_20"}'
),
(
    (SELECT id FROM ages WHERE number = 3),
    25, 'Depo Savunması', 122000,
    '{"minerals": 4500, "energy": 3200, "premium_currency": 50}',
    '{"unit_type": "monster_forest_hydra", "alliance_feature": "alliance_depot_upgrade"}'
),
(
    (SELECT id FROM ages WHERE number = 3),
    26, 'İttifak Savaşı', 140000,
    '{"minerals": 5000, "energy": 3600, "premium_currency": 60}',
    '{"unit_type": "monster_blood_wyrm", "alliance_feature": "war_rewards"}'
),
(
    (SELECT id FROM ages WHERE number = 3),
    27, 'Koalisyon Zaferi', 160000,
    '{"minerals": 6000, "energy": 4200, "premium_currency": 75, "cosmetic_item": "coalition_banner"}',
    '{"age_completion": 3, "age4_unlock": true, "unit_type": "monster_elder_beast"}'
)
ON CONFLICT (number) DO NOTHING;

-- ───────────── Monster Race Units (Canavarlar - Age 3) ─────────────
INSERT INTO units (age_id, level_unlock, code, name, race, unit_type, tier, attack, defense, speed, hp, energy_cost, mineral_cost, special_ability, subspace_bonus, description) VALUES
(
    (SELECT id FROM ages WHERE number = 3), 19,
    'monster_feral_wolf', 'Kuduz Kurt', 'monster', 'scout', 19,
    90, 55, 200, 1200, 120, 200,
    '{"name": "feral_charge", "effect": "first_attack_damage_plus_50pct", "cooldown": 5}',
    '{}',
    'Canavarlar ırkının hızlı ve saldırgan keşif birimi'
),
(
    (SELECT id FROM ages WHERE number = 3), 20,
    'monster_vine_creeper', 'Sarmaşık Sürüneni', 'monster', 'support', 20,
    70, 80, 80, 1600, 140, 260,
    '{"name": "entangle", "effect": "slow_enemy_50pct_for_2_turns", "cooldown": 6}',
    '{}',
    'Düşman birimlerini sarmaşıklarla yakalayan destek birimi'
),
(
    (SELECT id FROM ages WHERE number = 3), 21,
    'monster_bone_crusher', 'Kemik Ezici', 'monster', 'infantry', 21,
    130, 95, 90, 2400, 200, 380,
    '{"name": "armor_break", "effect": "reduce_enemy_defense_30pct_for_3_turns", "cooldown": 7}',
    '{}',
    'Düşman zırhını parçalayan ağır piyade birimi'
),
(
    (SELECT id FROM ages WHERE number = 3), 22,
    'monster_pack_hunter', 'Sürü Avcısı', 'monster', 'infantry', 22,
    145, 80, 130, 2100, 220, 400,
    '{"name": "pack_strike", "effect": "attack_twice_if_allied_monster_nearby", "cooldown": 4}',
    '{}',
    'Yanındaki canavar birimleriyle sinerji yapan avcı birimi'
),
(
    (SELECT id FROM ages WHERE number = 3), 23,
    'monster_toxic_spitter', 'Zehirli Tükürcü', 'monster', 'ranged', 23,
    160, 60, 100, 1800, 250, 450,
    '{"name": "toxic_spit", "effect": "poison_50_damage_per_turn_for_4_turns", "cooldown": 5}',
    '{}',
    'Zehirli tükürük fırlatan uzun menzilli canavar birimi'
),
(
    (SELECT id FROM ages WHERE number = 3), 24,
    'monster_stone_golem', 'Taş Golem', 'monster', 'tank', 24,
    100, 200, 40, 5500, 350, 700,
    '{"name": "stone_skin", "effect": "absorb_500_damage_shield", "cooldown": 10}',
    '{}',
    'İnanılmaz savunmasıyla ittifak hattını tutan taş devası'
),
(
    (SELECT id FROM ages WHERE number = 3), 25,
    'monster_forest_hydra', 'Orman Hidrası', 'monster', 'elite', 25,
    185, 150, 80, 4800, 450, 900,
    '{"name": "multi_head", "effect": "attack_3_random_enemies", "cooldown": 6}',
    '{}',
    'Çok başlı saldırı yapan ve ormanın koruyucusu olan elit canavar'
),
(
    (SELECT id FROM ages WHERE number = 3), 26,
    'monster_blood_wyrm', 'Kan Ejderi', 'monster', 'elite', 26,
    220, 120, 110, 5200, 550, 1100,
    '{"name": "blood_frenzy", "effect": "lifesteal_30pct_of_damage_dealt", "cooldown": 8}',
    '{}',
    'Verdiği hasarın bir kısmını can olarak geri alan kan ejderi'
),
(
    (SELECT id FROM ages WHERE number = 3), 27,
    'monster_elder_beast', 'Yaşlı Canavar', 'monster', 'hero', 27,
    280, 200, 90, 8500, 700, 1500,
    '{"name": "primal_roar", "effect": "buff_all_monsters_25pct_attack_defense", "cooldown": 15}',
    '{}',
    'Canavarlar ırkının efsanevi lideri; tüm canavarları güçlendirir'
)
ON CONFLICT (code) DO NOTHING;

-- ───────────── Alliances (İttifaklar) ─────────────
CREATE TABLE IF NOT EXISTS alliances (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL UNIQUE,
    tag           VARCHAR(10)  NOT NULL UNIQUE,
    description   TEXT,
    leader_id     UUID        NOT NULL REFERENCES users(id),
    emblem        VARCHAR(50),
    level         SMALLINT    NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
    xp            INTEGER     NOT NULL DEFAULT 0,
    max_members   INTEGER     NOT NULL DEFAULT 20,
    is_open       BOOLEAN     NOT NULL DEFAULT true,
    min_elo       INTEGER     NOT NULL DEFAULT 0,
    war_wins      INTEGER     NOT NULL DEFAULT 0,
    war_losses    INTEGER     NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────── Alliance Members ─────────────
CREATE TABLE IF NOT EXISTS alliance_members (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    alliance_id   UUID        NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role          VARCHAR(20) NOT NULL DEFAULT 'member'
                    CHECK (role IN ('leader', 'officer', 'veteran', 'member', 'recruit')),
    contribution  INTEGER     NOT NULL DEFAULT 0,
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

-- ───────────── Alliance Wars ─────────────
CREATE TABLE IF NOT EXISTS alliance_wars (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    attacker_id      UUID        NOT NULL REFERENCES alliances(id),
    defender_id      UUID        NOT NULL REFERENCES alliances(id),
    status           VARCHAR(20) NOT NULL DEFAULT 'declared'
                       CHECK (status IN ('declared', 'active', 'truce', 'ended')),
    attacker_score   INTEGER     NOT NULL DEFAULT 0,
    defender_score   INTEGER     NOT NULL DEFAULT 0,
    winner_id        UUID        REFERENCES alliances(id),
    declared_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    starts_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    ends_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (attacker_id <> defender_id)
);

-- ───────────── Alliance Storage (Depo) ─────────────
CREATE TABLE IF NOT EXISTS alliance_storage (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    alliance_id   UUID        NOT NULL UNIQUE REFERENCES alliances(id) ON DELETE CASCADE,
    minerals      BIGINT      NOT NULL DEFAULT 0 CHECK (minerals >= 0),
    energy        BIGINT      NOT NULL DEFAULT 0 CHECK (energy >= 0),
    premium_gems  INTEGER     NOT NULL DEFAULT 0 CHECK (premium_gems >= 0),
    capacity      BIGINT      NOT NULL DEFAULT 500000,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────── Chat Messages ─────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id     UUID        NOT NULL REFERENCES users(id),
    channel_type  VARCHAR(20) NOT NULL
                    CHECK (channel_type IN ('global', 'alliance', 'private', 'system')),
    channel_id    VARCHAR(100),
    content       TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
    is_deleted    BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────── Indexes ─────────────
CREATE INDEX IF NOT EXISTS idx_alliance_members_alliance ON alliance_members(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_members_user    ON alliance_members(user_id);
CREATE INDEX IF NOT EXISTS idx_alliance_wars_attacker   ON alliance_wars(attacker_id, status);
CREATE INDEX IF NOT EXISTS idx_alliance_wars_defender   ON alliance_wars(defender_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel    ON chat_messages(channel_type, channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender     ON chat_messages(sender_id, created_at DESC);

-- ───────────── Triggers ─────────────
CREATE TRIGGER trg_alliances_updated_at
    BEFORE UPDATE ON alliances
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_alliance_wars_updated_at
    BEFORE UPDATE ON alliance_wars
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- Auto-create storage row when alliance is created
CREATE OR REPLACE FUNCTION fn_create_alliance_storage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO alliance_storage (alliance_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alliance_storage_create
    AFTER INSERT ON alliances
    FOR EACH ROW EXECUTE FUNCTION fn_create_alliance_storage();
