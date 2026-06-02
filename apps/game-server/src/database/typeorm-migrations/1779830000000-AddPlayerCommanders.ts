import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `player_commanders` table — per-user commander progression.
 *
 * Replaces the previous `Map<userId, commanderId>` in-memory store on api's
 * commanders-stub controller, which lost all "active commander" state on
 * container restart. Now backed by Postgres with:
 *
 *   - level (int, 1-30) — XP-driven, +5% bonus amplification per level
 *   - xp (bigint) — current XP toward next level
 *   - unlocked_at (timestamptz | null) — when this commander joined the
 *     roster. NULL = locked (the 4th-tier commander is acquired via
 *     quest/age-gate; see commanders.service.ts unlock logic)
 *   - is_active (bool) — at most one TRUE per user (partial unique index)
 *   - last_battle_at (timestamptz | null) — last XP-eligible activity,
 *     used to throttle XP grant rate-limiting if needed later
 *
 * Composite unique on (user_id, commander_id) — each commander instance
 * per user is unique. A user can own multiple commanders (different races
 * after race-change pass; multiple per-race slots if game design ever
 * allows that).
 *
 * Bootstrap: when a user calls GET /commanders/me, the service lazily
 * INSERTs rows for every UNLOCKED catalog entry of their race (the 3
 * starter commanders per race). The 4th locked commander row is created
 * by the unlock flow (not during this migration).
 */
export class AddPlayerCommanders1779830000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS player_commanders (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL,
        commander_id     VARCHAR(64) NOT NULL,
        level            INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 30),
        xp               BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0),
        unlocked_at      TIMESTAMPTZ NULL,
        is_active        BOOLEAN NOT NULL DEFAULT FALSE,
        last_battle_at   TIMESTAMPTZ NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT player_commanders_user_commander_unique UNIQUE (user_id, commander_id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_player_commanders_user_id ON player_commanders (user_id)`,
    );

    // Partial unique: at most one active commander per user. NULL/FALSE
    // rows are excluded so the index stays slim and the constraint reads
    // as "if active=true, must be the only one for this user".
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_player_commanders_one_active_per_user
         ON player_commanders (user_id) WHERE is_active = TRUE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_player_commanders_one_active_per_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_player_commanders_user_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS player_commanders`);
  }
}
