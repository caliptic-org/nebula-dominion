-- Migration 002: Subspace Mechanics
-- Alternatif boyut sistemi, özel subspace savaşları

-- Subspace zones (alternatif boyut bölgeleri)
CREATE TABLE IF NOT EXISTS subspace_zones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    tier            VARCHAR(20) NOT NULL CHECK (tier IN ('alpha', 'beta', 'gamma', 'delta', 'omega')),
    level_required  INTEGER NOT NULL,
    capacity        INTEGER NOT NULL DEFAULT 100,
    description     TEXT,
    modifiers       JSONB NOT NULL DEFAULT '{}',
    hazards         JSONB NOT NULL DEFAULT '[]',
    rewards         JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subspace_zones (code, name, tier, level_required, capacity, description, modifiers, hazards, rewards) VALUES
(
    'subspace_alpha',
    'Subspace Alfa - Parçalanmış Boyut',
    'alpha', 37, 200,
    'İlk boyutsal kırık. Zayıf sinyal ama güvenli giriş.',
    '{"speed_multiplier": 1.2, "defense_penalty": 0.9, "energy_regen": 1.5}',
    '[{"type": "void_storm", "chance": 0.1, "damage_pct": 5}]',
    '{"minerals": 3000, "energy": 2000, "void_crystals": 10}'
),
(
    'subspace_beta',
    'Subspace Beta - Karanlık Koridor',
    'beta', 40, 150,
    'Daha derin boyutsal katman. Güçlü düşmanlar, büyük ödüller.',
    '{"attack_multiplier": 1.3, "hp_penalty": 0.85, "crit_chance_bonus": 0.1}',
    '[{"type": "dimensional_rift", "chance": 0.15, "damage_pct": 10}, {"type": "time_distortion", "chance": 0.05, "effect": "slow_50pct"}]',
    '{"minerals": 6000, "energy": 4000, "void_crystals": 25, "rare_unit_chance": 0.05}'
),
(
    'subspace_gamma',
    'Subspace Gama - Boşluğun Kalbi',
    'gamma', 41, 100,
    'Boyutsal uzayın merkezi. Extreme tehlikeler, efsanevi ödüller.',
    '{"all_stats_multiplier": 1.5, "energy_drain": 0.02, "time_dilation": 0.7}',
    '[{"type": "worm_echo", "chance": 0.25, "damage_pct": 20}, {"type": "reality_collapse", "chance": 0.08, "effect": "instant_death_chance_5pct"}]',
    '{"minerals": 12000, "energy": 8000, "void_crystals": 60, "legendary_unit_chance": 0.1, "worm_fragment": 1}'
),
(
    'subspace_delta',
    'Subspace Delta - Sonsuz Girdap',
    'delta', 43, 50,
    'Kurt''un yaşam alanı. Hayatta kalan varsa ödül muazzam.',
    '{"all_stats_multiplier": 2.0, "continuous_damage": 0.01}',
    '[{"type": "devouring_worm_spawn", "chance": 0.4, "effect": "mini_boss_encounter"}]',
    '{"void_crystals": 100, "legendary_unit_chance": 0.2, "worm_core_fragment": 1}'
),
(
    'subspace_omega',
    'Subspace Omega - Kurt''un Kalesi',
    'omega', 45, 20,
    'Yutucu Kurt''un ana yuvası. Sadece en güçlü savaşçılar girer.',
    '{"enemy_power_multiplier": 3.0}',
    '[{"type": "worm_territory", "chance": 1.0, "effect": "boss_battle_triggered"}]',
    '{"void_crystals": 500, "worm_heart": 1, "legendary_cosmetic": "worm_slayer_armor"}'
)
ON CONFLICT (code) DO NOTHING;

-- Subspace sessions (oyuncu subspace girişleri)
CREATE TABLE IF NOT EXISTS subspace_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL,
    zone_id         UUID NOT NULL REFERENCES subspace_zones(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'fled', 'killed', 'timeout')),
    entered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exited_at       TIMESTAMPTZ,
    duration_secs   INTEGER,
    units_deployed  JSONB NOT NULL DEFAULT '[]',
    hazards_hit     JSONB NOT NULL DEFAULT '[]',
    rewards_earned  JSONB NOT NULL DEFAULT '{}',
    enemies_killed  INTEGER NOT NULL DEFAULT 0,
    boss_defeated   BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subspace_sessions_user ON subspace_sessions(user_id);
CREATE INDEX idx_subspace_sessions_zone ON subspace_sessions(zone_id);
CREATE INDEX idx_subspace_sessions_status ON subspace_sessions(status);

-- Subspace battles (özel boyutsal savaşlar)
CREATE TABLE IF NOT EXISTS subspace_battles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id         UUID NOT NULL REFERENCES subspace_zones(id),
    battle_type     VARCHAR(30) NOT NULL CHECK (battle_type IN ('pvp', 'pve_raid', 'guild_war', 'boss_hunt')),
    attacker_id     UUID NOT NULL,
    defender_id     UUID,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    attacker_units  JSONB NOT NULL DEFAULT '[]',
    defender_units  JSONB NOT NULL DEFAULT '[]',
    result          JSONB,
    winner_id       UUID,
    subspace_effects JSONB NOT NULL DEFAULT '[]',
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subspace_battles_attacker ON subspace_battles(attacker_id);
CREATE INDEX idx_subspace_battles_defender ON subspace_battles(defender_id);
CREATE INDEX idx_subspace_battles_zone ON subspace_battles(zone_id);
CREATE INDEX idx_subspace_battles_status ON subspace_battles(status);

-- Void crystals (subspace para birimi)
CREATE TABLE IF NOT EXISTS user_void_crystals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL UNIQUE,
    balance         INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    total_earned    INTEGER NOT NULL DEFAULT 0,
    total_spent     INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_void_crystals_user ON user_void_crystals(user_id);
