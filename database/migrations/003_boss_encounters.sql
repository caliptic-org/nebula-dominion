-- Migration 003: Boss Encounters - Yutucu Kurt (Devouring Worm)
-- Endgame boss encounter, özel mekanikler

CREATE TABLE IF NOT EXISTS boss_encounters (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    phase           INTEGER NOT NULL DEFAULT 1,
    age_id          UUID NOT NULL REFERENCES ages(id),
    level_required  INTEGER NOT NULL,
    hp              BIGINT NOT NULL,
    attack          INTEGER NOT NULL,
    defense         INTEGER NOT NULL,
    speed           INTEGER NOT NULL,
    mechanics       JSONB NOT NULL DEFAULT '[]',
    phases          JSONB NOT NULL DEFAULT '[]',
    weaknesses      JSONB NOT NULL DEFAULT '[]',
    resistances     JSONB NOT NULL DEFAULT '[]',
    rewards         JSONB NOT NULL DEFAULT '{}',
    lore            TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Yutucu Kurt boss - 3 faz
INSERT INTO boss_encounters (code, name, phase, age_id, level_required, hp, attack, defense, speed, mechanics, phases, weaknesses, resistances, rewards, lore) VALUES
(
    'devouring_worm_phase1',
    'Yutucu Kurt - Faz 1: Uyanış',
    1,
    (SELECT id FROM ages WHERE number = 5),
    43, 500000, 800, 400, 120,
    '[
        {"name": "tail_sweep", "description": "Kuyruğuyla tüm ön sırayı eziyor", "damage_pct": 40, "cooldown": 5},
        {"name": "void_breath", "description": "Subspace enerjisi püskürtüyor", "damage_pct": 60, "aoe": true, "cooldown": 8},
        {"name": "burrow", "description": "Yerin altına iniyor, 2 tur sonra sürpriz saldırı", "cooldown": 12}
    ]',
    '[
        {"phase": 1, "hp_threshold": 1.0, "name": "Uyanış", "description": "Kurt uykusundan uyanıyor. Nispeten zayıf."},
        {"phase": 2, "hp_threshold": 0.6, "name": "Öfke", "description": "HP %60 altına düşünce bu faza geçer."},
        {"phase": 3, "hp_threshold": 0.3, "name": "Çılgınlık", "description": "HP %30 altında nihai form."}
    ]',
    '[
        {"type": "anti_worm_hunter", "damage_multiplier": 2.0},
        {"type": "void_crystal_weapon", "damage_multiplier": 1.5},
        {"element": "dimensional_energy", "damage_multiplier": 1.3}
    ]',
    '[
        {"type": "fire", "resistance_pct": 80},
        {"type": "physical", "resistance_pct": 40},
        {"element": "darkness", "resistance_pct": 90}
    ]',
    '{"void_crystals": 200, "exp": 50000, "rare_unit_chance": 0.3, "loot_table": "worm_phase1"}',
    'Kadim zamanlardan beri subspace''in derinliklerinde uyuyan Yutucu Kurt, boyutsal aktivite arttıkça uyanmaya başladı.'
),
(
    'devouring_worm_phase2',
    'Yutucu Kurt - Faz 2: Öfke',
    2,
    (SELECT id FROM ages WHERE number = 5),
    44, 800000, 1200, 600, 150,
    '[
        {"name": "dimension_rend", "description": "Boyutu yararak tüm birimlere hasar", "damage_pct": 80, "aoe": true, "cooldown": 6},
        {"name": "worm_spawn", "description": "Mini worm birimleri doğuruyor (3-5 adet)", "count": "3-5", "cooldown": 10},
        {"name": "reality_bite", "description": "Seçili birim anında yok edilir", "target": "random", "instant_kill": true, "cooldown": 15},
        {"name": "subspace_anchor", "description": "Tüm birimleri subspace''e hapsediyor 2 tur", "cooldown": 20}
    ]',
    '[]',
    '[
        {"type": "anti_worm_hunter", "damage_multiplier": 2.0},
        {"type": "void_crystal_weapon", "damage_multiplier": 1.8},
        {"type": "dimensional_energy_cannon", "damage_multiplier": 1.5}
    ]',
    '[
        {"type": "fire", "resistance_pct": 90},
        {"type": "physical", "resistance_pct": 60},
        {"type": "poison", "resistance_pct": 70}
    ]',
    '{"void_crystals": 400, "exp": 80000, "rare_unit_chance": 0.5, "worm_fragment": 1, "loot_table": "worm_phase2"}',
    'Öfkelenen Yutucu Kurt boyutları parçalıyor. Yavru wormlar doğurarak güç katlamaya başlıyor.'
),
(
    'devouring_worm_final',
    'Yutucu Kurt - Final: Kozmik Yıkıcı',
    3,
    (SELECT id FROM ages WHERE number = 5),
    45, 1500000, 2000, 1000, 200,
    '[
        {"name": "universe_consume", "description": "Haritanın %30''unu yutarak birim ve kaynak yok eder", "damage_pct": 120, "cooldown": 8},
        {"name": "dimensional_collapse", "description": "Subspace''i çöktürüyor - tüm subspace bonuslar kaybolur", "duration_turns": 3, "cooldown": 12},
        {"name": "worm_army", "description": "10-15 mini worm doğurur", "count": "10-15", "cooldown": 6},
        {"name": "quantum_bite", "description": "Hedefin maksimum HP''inin %15''ini direkt hasar olarak verir", "hp_pct_damage": 0.15, "cooldown": 5},
        {"name": "final_form_rage", "description": "HP %10''un altında tüm özellikleri 2x artar", "trigger": "hp_below_10pct", "multiplier": 2.0}
    ]',
    '[]',
    '[
        {"type": "anti_worm_hunter", "damage_multiplier": 2.5},
        {"type": "void_crystal_weapon", "damage_multiplier": 2.0},
        {"type": "worm_bane_skill", "damage_multiplier": 3.0},
        {"boss_phase": "previous_phases_cleared", "damage_bonus_pct": 20}
    ]',
    '[
        {"type": "physical", "resistance_pct": 70},
        {"type": "magic", "resistance_pct": 50},
        {"type": "poison", "resistance_pct": 85},
        {"type": "fire", "resistance_pct": 95}
    ]',
    '{
        "void_crystals": 1000,
        "exp": 200000,
        "worm_heart": 1,
        "legendary_cosmetic": "worm_slayer_armor",
        "title": "Yutucu Kurt Katili",
        "achievement": "dimensional_conqueror",
        "age5_completion_bonus": true,
        "loot_table": "worm_final"
    }',
    'Son gücüyle savaşan Yutucu Kurt boyutları parçalıyor. Bu savaşı kazanan evrenin kaderini değiştirecek.'
)
ON CONFLICT (code) DO NOTHING;

-- Boss encounter attempts (oyuncu boss deneme kayıtları)
CREATE TABLE IF NOT EXISTS boss_encounter_attempts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL,
    boss_encounter_id   UUID NOT NULL REFERENCES boss_encounters(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'victory', 'defeat', 'fled', 'timeout')),
    current_phase       INTEGER NOT NULL DEFAULT 1,
    boss_hp_remaining   BIGINT,
    units_deployed      JSONB NOT NULL DEFAULT '[]',
    units_lost          JSONB NOT NULL DEFAULT '[]',
    damage_dealt        BIGINT NOT NULL DEFAULT 0,
    damage_taken        BIGINT NOT NULL DEFAULT 0,
    mechanics_triggered JSONB NOT NULL DEFAULT '[]',
    rewards_earned      JSONB,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    duration_secs       INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_boss_attempts_user ON boss_encounter_attempts(user_id);
CREATE INDEX idx_boss_attempts_boss ON boss_encounter_attempts(boss_encounter_id);
CREATE INDEX idx_boss_attempts_status ON boss_encounter_attempts(status);

-- Worm leaderboard (Yutucu Kurt öldürme liderlik tablosu)
CREATE TABLE IF NOT EXISTS boss_leaderboard (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boss_encounter_id   UUID NOT NULL REFERENCES boss_encounters(id),
    user_id             UUID NOT NULL,
    rank                INTEGER,
    total_damage        BIGINT NOT NULL DEFAULT 0,
    fastest_kill_secs   INTEGER,
    kill_count          INTEGER NOT NULL DEFAULT 0,
    last_kill_at        TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(boss_encounter_id, user_id)
);

CREATE INDEX idx_boss_leaderboard_boss ON boss_leaderboard(boss_encounter_id);
CREATE INDEX idx_boss_leaderboard_damage ON boss_leaderboard(total_damage DESC);
