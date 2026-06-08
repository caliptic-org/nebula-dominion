import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ELO-NOT-PERSISTED (cycle 23) — give players a durable ranked rating.
 *
 * Before this, matchmaking seeded `elo`/`gamesPlayed` from the JWT payload
 * (which carries neither — only sub/email/username), so EVERY player queued
 * at elo 1000 with games_played 0 forever: matchmaking was effectively random
 * (one big bucket) and finishGame's computed `newElo` was emitted to the
 * client but never stored. There was no ladder and the K-factor never decayed.
 *
 * `player_levels` is already keyed by the auth `user_id` (unique index), so
 * the rating lives here alongside level/age rather than in the legacy,
 * serviceless `players` table (keyed by its own uuid + username, never read by
 * the live flow). ProgressionService — already injected into GameService and
 * exported to the matchmaking gateway — owns the read/write.
 *
 * Additive + IF NOT EXISTS = idempotent and safe to re-run. The game-server
 * runs migrationsRun on boot, so a failing migration crash-loops it; this one
 * only adds two NOT NULL columns with defaults that backfill existing rows to
 * the 1000 / 0 baseline, which cannot fail on existing data.
 *
 * Companion code: ProgressionService.getRanking / recordMatchResult,
 *   MatchmakingGateway (seed read), GameService.finishGame (PvP result write).
 */
export class AddPlayerEloRating1779950000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE player_levels
        ADD COLUMN IF NOT EXISTS elo INTEGER NOT NULL DEFAULT 1000,
        ADD COLUMN IF NOT EXISTS ranked_games INTEGER NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE player_levels
        DROP COLUMN IF EXISTS elo,
        DROP COLUMN IF EXISTS ranked_games
    `);
  }
}
