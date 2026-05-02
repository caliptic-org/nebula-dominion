import { MigrationInterface, QueryRunner } from 'typeorm';

export class SectorWarsSchema1746300000000 implements MigrationInterface {
  name = 'SectorWarsSchema1746300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enums ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE sector_bonus_type AS ENUM (
        'none', 'attack_boost', 'defense_boost', 'resource_bonus', 'xp_bonus', 'dark_matter_bonus'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE sector_battle_status AS ENUM (
        'pending', 'in_progress', 'attacker_won', 'defender_won', 'draw'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE league_tier AS ENUM (
        'bronze', 'silver', 'gold', 'platinum', 'diamond'
      )
    `);

    // ─── Sectors ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE sectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        map_x INT NOT NULL,
        map_y INT NOT NULL,
        controlling_alliance_id UUID,
        bonus_type sector_bonus_type NOT NULL DEFAULT 'none',
        bonus_value INT NOT NULL DEFAULT 0,
        defense_rating INT NOT NULL DEFAULT 100,
        is_contested BOOLEAN NOT NULL DEFAULT FALSE,
        last_contested_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_sectors_alliance ON sectors (controlling_alliance_id)`);
    await queryRunner.query(`CREATE INDEX idx_sectors_map ON sectors (map_x, map_y)`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_sectors_coords ON sectors (map_x, map_y)`);

    await queryRunner.query(`
      CREATE TRIGGER update_sectors_updated_at
        BEFORE UPDATE ON sectors
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // ─── Sector battles ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE sector_battles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
        attacker_alliance_id UUID NOT NULL,
        defender_alliance_id UUID,
        attacker_player_id UUID NOT NULL,
        defender_player_id UUID,
        status sector_battle_status NOT NULL DEFAULT 'pending',
        attacker_score INT NOT NULL DEFAULT 0,
        defender_score INT NOT NULL DEFAULT 0,
        units_snapshot JSONB NOT NULL DEFAULT '{}',
        started_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_sb_sector ON sector_battles (sector_id)`);
    await queryRunner.query(`CREATE INDEX idx_sb_attacker_alliance ON sector_battles (attacker_alliance_id)`);
    await queryRunner.query(`CREATE INDEX idx_sb_defender_alliance ON sector_battles (defender_alliance_id)`);
    await queryRunner.query(`CREATE INDEX idx_sb_status ON sector_battles (status)`);

    // ─── Weekly leagues ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE weekly_leagues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        season_number INT NOT NULL,
        tier league_tier NOT NULL DEFAULT 'bronze',
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        prize_description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_wl_season ON weekly_leagues (season_number)`);
    await queryRunner.query(`CREATE INDEX idx_wl_active ON weekly_leagues (is_active)`);
    await queryRunner.query(`CREATE INDEX idx_wl_tier ON weekly_leagues (tier)`);

    // ─── League participants ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE league_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        league_id UUID NOT NULL REFERENCES weekly_leagues(id) ON DELETE CASCADE,
        player_id UUID NOT NULL,
        username VARCHAR(100) NOT NULL,
        score INT NOT NULL DEFAULT 0,
        rank INT,
        battles_won INT NOT NULL DEFAULT 0,
        battles_lost INT NOT NULL DEFAULT 0,
        sector_captures INT NOT NULL DEFAULT 0,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(league_id, player_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_lp_league ON league_participants (league_id)`);
    await queryRunner.query(`CREATE INDEX idx_lp_player ON league_participants (player_id)`);
    await queryRunner.query(`CREATE INDEX idx_lp_score ON league_participants (league_id, score DESC)`);

    // ─── Seed: Galactic Age sectors map (7×7 grid) ─────────────────────────────
    await queryRunner.query(`
      INSERT INTO sectors (name, description, map_x, map_y, bonus_type, bonus_value, defense_rating) VALUES
        ('Alpha Nexus',       'The central hub of galactic trade routes',        3, 3, 'resource_bonus',    25, 200),
        ('Void Rift Alpha',   'A tear in space leaking dark matter energy',      1, 1, 'dark_matter_bonus', 30, 150),
        ('Demon Gate',        'Ancient portal through which demonic forces pass',5, 1, 'attack_boost',      20, 180),
        ('Crimson Expanse',   'Blood-red nebula rich in mineral deposits',       7, 1, 'resource_bonus',    20, 120),
        ('Obsidian Fortress', 'A naturally fortified asteroid cluster',          1, 4, 'defense_boost',     25, 220),
        ('Chaos Pinnacle',    'Where chaotic energies converge',                 7, 4, 'attack_boost',      15, 130),
        ('Inferno Reach',     'Superheated plasma clouds accelerating units',   1, 7, 'xp_bonus',          20, 110),
        ('Shadow Terminus',   'The shadowy edge of the galactic sector',         4, 7, 'dark_matter_bonus', 20, 140),
        ('Galactic Core',     'Dense star cluster granting massive XP gains',   7, 7, 'xp_bonus',          30, 160),
        ('Pyroclast Fields',  'Volcanic moon surface with raw mineral veins',    2, 2, 'resource_bonus',    15, 100),
        ('Dark Veil',         'Hidden sector cloaked by a nebula',              6, 2, 'dark_matter_bonus', 15, 120),
        ('Iron Bastion',      'Heavily armored space station remnants',          2, 6, 'defense_boost',     20, 170),
        ('Storm Front',       'Electromagnetic storm that boosts attack power',  6, 6, 'attack_boost',      20, 130),
        ('Ether Crossing',    'Interdimensional crossing point',                 4, 2, 'xp_bonus',          15, 110),
        ('Stellar Graveyard', 'Remains of destroyed star systems',               4, 5, 'none',               0, 90),
        ('Nova Flare',        'A dying star granting immense energy',            2, 4, 'xp_bonus',          25, 140),
        ('Abyss Gateway',     'Entry point to the galactic abyss',              6, 4, 'dark_matter_bonus', 20, 150),
        ('Mineral Belt',      'Rich asteroid belt teeming with minerals',        3, 1, 'resource_bonus',    20, 100),
        ('Crystal Spire',     'Crystalline formations amplifying defense',       5, 7, 'defense_boost',     15, 130),
        ('Warp Nexus',        'Hyperspace conduit granting XP on capture',      5, 4, 'xp_bonus',          20, 120)
    `);

    // ─── Seed: First weekly league season ───────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO weekly_leagues (season_number, tier, starts_at, ends_at, is_active, prize_description) VALUES
        (1, 'bronze',   NOW(), NOW() + INTERVAL '7 days', TRUE, 'Bronze League Season 1 — Top 3 earn rare Demon unit fragments'),
        (1, 'silver',   NOW(), NOW() + INTERVAL '7 days', TRUE, 'Silver League Season 1 — Top 3 earn Tier-5 Demon units'),
        (1, 'gold',     NOW(), NOW() + INTERVAL '7 days', TRUE, 'Gold League Season 1 — Top 3 earn legendary Void Spawn units'),
        (1, 'platinum', NOW(), NOW() + INTERVAL '7 days', TRUE, 'Platinum League Season 1 — Top 3 earn sector control bonuses'),
        (1, 'diamond',  NOW(), NOW() + INTERVAL '7 days', TRUE, 'Diamond League Season 1 — Top 3 become Galactic Champions')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS league_participants`);
    await queryRunner.query(`DROP TABLE IF EXISTS weekly_leagues`);
    await queryRunner.query(`DROP TABLE IF EXISTS sector_battles`);
    await queryRunner.query(`DROP TABLE IF EXISTS sectors`);
    await queryRunner.query(`DROP TYPE IF EXISTS league_tier`);
    await queryRunner.query(`DROP TYPE IF EXISTS sector_battle_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS sector_bonus_type`);
  }
}
