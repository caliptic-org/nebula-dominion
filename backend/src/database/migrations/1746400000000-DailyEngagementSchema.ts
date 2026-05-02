import { MigrationInterface, QueryRunner } from 'typeorm';

export class DailyEngagementSchema1746400000000 implements MigrationInterface {
  name = 'DailyEngagementSchema1746400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── login_streaks ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE login_streaks (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id         UUID        NOT NULL UNIQUE,
        current_streak    INTEGER     NOT NULL DEFAULT 0,
        longest_streak    INTEGER     NOT NULL DEFAULT 0,
        last_login_date   DATE,
        streak_start_date DATE,
        grace_period_used BOOLEAN     NOT NULL DEFAULT false,
        pending_rewards   JSONB       NOT NULL DEFAULT '[]'::jsonb,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_login_streaks_player_id ON login_streaks(player_id)
    `);

    await queryRunner.query(`
      CREATE TRIGGER login_streaks_updated_at
        BEFORE UPDATE ON login_streaks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // ─── daily_quest_profiles ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE daily_quest_profiles (
        id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id           UUID        NOT NULL UNIQUE,
        quest_date          DATE,
        quests              JSONB       NOT NULL DEFAULT '[]'::jsonb,
        bonus_chest_claimed BOOLEAN     NOT NULL DEFAULT false,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_daily_quest_profiles_player_id ON daily_quest_profiles(player_id)
    `);

    await queryRunner.query(`
      CREATE TRIGGER daily_quest_profiles_updated_at
        BEFORE UPDATE ON daily_quest_profiles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // ─── player_stamina ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE player_stamina (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id        UUID        NOT NULL UNIQUE,
        current_stamina  INTEGER     NOT NULL DEFAULT 10,
        max_stamina      INTEGER     NOT NULL DEFAULT 10,
        last_regen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_player_stamina_player_id ON player_stamina(player_id)
    `);

    await queryRunner.query(`
      CREATE TRIGGER player_stamina_updated_at
        BEFORE UPDATE ON player_stamina
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS player_stamina CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS daily_quest_profiles CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS login_streaks CASCADE`);
  }
}
