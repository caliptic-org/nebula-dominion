import { MigrationInterface, QueryRunner } from 'typeorm';

export class PvpProtectionSchema1746400000000 implements MigrationInterface {
  name = 'PvpProtectionSchema1746400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Extend battles table ─────────────────────────────────────────────────
    // Track whether a battle is against a bot (for matchmaking and KPI metrics)

    await queryRunner.query(`
      ALTER TABLE battles
        ADD COLUMN IF NOT EXISTS is_bot_opponent BOOLEAN NOT NULL DEFAULT FALSE
    `);

    // ─── Enums ────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TYPE bot_difficulty_enum AS ENUM ('easy', 'medium', 'hard')
    `);

    await queryRunner.query(`
      CREATE TYPE pvp_match_result_enum AS ENUM ('win', 'loss', 'draw')
    `);

    await queryRunner.query(`
      CREATE TYPE comeback_bonus_status_enum AS ENUM ('pending', 'claimed', 'expired')
    `);

    // ─── pvp_shields ──────────────────────────────────────────────────────────
    // One row per player. Tracks new-player protection window and bot-match quota.

    await queryRunner.query(`
      CREATE TABLE pvp_shields (
        player_id         UUID         PRIMARY KEY,
        shield_expires_at TIMESTAMPTZ  NOT NULL,
        opted_out         BOOLEAN      NOT NULL DEFAULT FALSE,
        opted_out_at      TIMESTAMPTZ,
        bot_matches_played INT         NOT NULL DEFAULT 0,
        human_only_matchmaking BOOLEAN NOT NULL DEFAULT FALSE,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_pvp_shields_expires ON pvp_shields (shield_expires_at)
        WHERE opted_out = FALSE
    `);

    // ─── pvp_bot_profiles ─────────────────────────────────────────────────────
    // Pool of scripted bot opponents for new-player matchmaking.

    await queryRunner.query(`
      CREATE TABLE pvp_bot_profiles (
        id          UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(100)         NOT NULL,
        race        VARCHAR(50)          NOT NULL,
        power_score INT                  NOT NULL,
        units       JSONB                NOT NULL,
        difficulty  bot_difficulty_enum  NOT NULL DEFAULT 'medium',
        is_active   BOOLEAN              NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_bot_profiles_power ON pvp_bot_profiles (power_score) WHERE is_active = TRUE`);

    // ─── pvp_match_records ────────────────────────────────────────────────────
    // Per-player PvP history used for consecutive-loss tracking.

    await queryRunner.query(`
      CREATE TABLE pvp_match_records (
        id                    UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id             UUID                   NOT NULL,
        battle_id             UUID                   NOT NULL,
        opponent_id           UUID,
        is_bot_match          BOOLEAN                NOT NULL DEFAULT FALSE,
        result                pvp_match_result_enum  NOT NULL,
        consecutive_losses    INT                    NOT NULL DEFAULT 0,
        player_power_score    INT                    NOT NULL DEFAULT 0,
        comeback_bonus_granted BOOLEAN               NOT NULL DEFAULT FALSE,
        created_at            TIMESTAMPTZ            NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_pvp_records_player ON pvp_match_records (player_id)`);
    await queryRunner.query(`CREATE INDEX idx_pvp_records_player_time ON pvp_match_records (player_id, created_at DESC)`);

    // ─── comeback_bonuses ─────────────────────────────────────────────────────
    // Recovery packages granted after 3 consecutive PvP losses.

    await queryRunner.query(`
      CREATE TABLE comeback_bonuses (
        id                  UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id           UUID                        NOT NULL,
        trigger_battle_id   UUID                        NOT NULL,
        status              comeback_bonus_status_enum  NOT NULL DEFAULT 'pending',
        mineral_reward      INT                         NOT NULL DEFAULT 1000,
        gas_reward          INT                         NOT NULL DEFAULT 500,
        free_heal           BOOLEAN                     NOT NULL DEFAULT TRUE,
        expires_at          TIMESTAMPTZ                 NOT NULL,
        granted_at          TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
        claimed_at          TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_comeback_bonuses_player_status ON comeback_bonuses (player_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_comeback_bonuses_expires ON comeback_bonuses (expires_at) WHERE status = 'pending'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS comeback_bonuses`);
    await queryRunner.query(`DROP TABLE IF EXISTS pvp_match_records`);
    await queryRunner.query(`DROP TABLE IF EXISTS pvp_bot_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS pvp_shields`);
    await queryRunner.query(`DROP TYPE IF EXISTS comeback_bonus_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS pvp_match_result_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS bot_difficulty_enum`);
    await queryRunner.query(`ALTER TABLE battles DROP COLUMN IF EXISTS is_bot_opponent`);
  }
}
