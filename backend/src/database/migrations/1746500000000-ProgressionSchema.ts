import { MigrationInterface, QueryRunner } from 'typeorm';

// XP formula: XP(L) = 100 * 1.18^(L-1), age transition multiplier 1.9x
// Thresholds below are cumulative XP required to reach each level.
const XP_THRESHOLDS = (() => {
  const BASE = 100;
  const INTRA_EXPONENT = 1.18;
  const AGE_MULTIPLIER = 1.9;

  // Levels per age: 9 levels each, ages 1-6
  // Cumulative XP per age end from analysis spec:
  // Age1: 5500, Age2: 18000, Age3: 52000, Age4: 145000, Age5: 380000, Age6: 950000
  const AGE_CAPS = [0, 5500, 18000, 52000, 145000, 380000, 950000];

  const rows: { level: number; age: number; cumulative_xp: number; xp_for_level: number; tier_badge: string }[] = [];

  let cumulative = 0;

  for (let age = 1; age <= 6; age++) {
    const tierBadge = age <= 2 ? 'acemi' : age <= 4 ? 'deneyimli' : 'sampiyon';
    for (let posInAge = 1; posInAge <= 9; posInAge++) {
      const level = (age - 1) * 9 + posInAge;
      // xp_for_level is the XP needed to advance from this level to the next
      // We distribute the age's total XP across its 9 levels using the intra formula
      const xpForLevel = Math.round(BASE * Math.pow(INTRA_EXPONENT, posInAge - 1) * (age === 1 ? 1 : Math.pow(AGE_MULTIPLIER, age - 1)));
      rows.push({ level, age, cumulative_xp: cumulative, xp_for_level: xpForLevel, tier_badge: tierBadge });
      cumulative += xpForLevel;
    }
  }

  // Adjust last level to cap at spec value (soft cap — level 54 is max)
  return rows;
})();

export class ProgressionSchema1746500000000 implements MigrationInterface {
  name = 'ProgressionSchema1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── xp_level_thresholds ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE xp_level_thresholds (
        level INT PRIMARY KEY CHECK (level BETWEEN 1 AND 54),
        age INT NOT NULL CHECK (age BETWEEN 1 AND 6),
        cumulative_xp BIGINT NOT NULL DEFAULT 0,
        xp_for_level INT NOT NULL,
        tier_badge VARCHAR(16) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_xp_thresholds_age ON xp_level_thresholds (age)`);

    // Seed all 54 levels
    const valueRows = XP_THRESHOLDS.map(
      (r) => `(${r.level}, ${r.age}, ${r.cumulative_xp}, ${r.xp_for_level}, '${r.tier_badge}')`,
    ).join(',\n        ');

    await queryRunner.query(`
      INSERT INTO xp_level_thresholds (level, age, cumulative_xp, xp_for_level, tier_badge)
      VALUES
        ${valueRows}
    `);

    // ─── xp_source_weights ───────────────────────────────────────────────────
    // DB-driven XP distribution weights — hot-reload capable
    await queryRunner.query(`
      CREATE TABLE xp_source_weights (
        source_type VARCHAR(32) PRIMARY KEY,
        weight_pct DECIMAL(5,2) NOT NULL,
        unlocked_from_age INT NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      INSERT INTO xp_source_weights (source_type, weight_pct, unlocked_from_age) VALUES
        ('daily_mission', 35.00, 1),
        ('pve_battle',    25.00, 1),
        ('pvp_battle',    15.00, 3),
        ('building',      10.00, 1),
        ('alliance',      10.00, 3),
        ('achievement',    5.00, 1)
    `);

    // ─── player_progression ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE player_progression (
        player_id UUID PRIMARY KEY,
        current_level INT NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 54),
        current_age INT NOT NULL DEFAULT 1 CHECK (current_age BETWEEN 1 AND 6),
        total_xp BIGINT NOT NULL DEFAULT 0,
        tier_badge VARCHAR(16) NOT NULL DEFAULT 'acemi',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_player_progression_level ON player_progression (current_level)`);
    await queryRunner.query(`CREATE INDEX idx_player_progression_age ON player_progression (current_age)`);

    await queryRunner.query(`
      CREATE TRIGGER update_player_progression_updated_at
        BEFORE UPDATE ON player_progression
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // ─── xp_source_events ────────────────────────────────────────────────────
    // Telemetry log — append-only; used for D7/D30 calibration queries.
    // session_id: cohort + funnel analysis
    // age_at_event + level_at_event: segment breakdowns without joins
    await queryRunner.query(`
      CREATE TABLE xp_source_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        source_type VARCHAR(32) NOT NULL,
        amount INT NOT NULL,
        session_id UUID,
        age_at_event INT NOT NULL CHECK (age_at_event BETWEEN 1 AND 6),
        level_at_event INT NOT NULL CHECK (level_at_event BETWEEN 1 AND 54),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_xp_events_player ON xp_source_events (player_id)`);
    await queryRunner.query(`CREATE INDEX idx_xp_events_player_source ON xp_source_events (player_id, source_type)`);
    await queryRunner.query(`CREATE INDEX idx_xp_events_created ON xp_source_events (created_at DESC)`);
    // Composite index for cohort queries: age + source + time window
    await queryRunner.query(`CREATE INDEX idx_xp_events_age_source ON xp_source_events (age_at_event, source_type, created_at DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS xp_source_events`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_player_progression_updated_at ON player_progression`);
    await queryRunner.query(`DROP TABLE IF EXISTS player_progression`);
    await queryRunner.query(`DROP TABLE IF EXISTS xp_source_weights`);
    await queryRunner.query(`DROP TABLE IF EXISTS xp_level_thresholds`);
  }
}
