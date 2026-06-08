import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FLOW-004 (endgame prestige) — give maxed players an endless progression goal.
 *
 * At MAX_LEVEL (54) awardXp early-returned and the XP was discarded. It now
 * accrues into a PRESTIGE track on player_levels: every PRESTIGE_XP_PER_LEVEL
 * of post-max XP grants a prestige level, each worth a small permanent
 * production bonus (ProgressionService.applyPrestigeXp / getPrestigeProductionBonus,
 * applied in BuildingsService.recalculateProductionRates).
 *
 * Additive + IF NOT EXISTS = idempotent and safe under boot migrationsRun. The
 * two NOT NULL columns default to 0, so every existing player starts at
 * prestige 0 (no behaviour change until they reach max level and earn XP).
 */
export class AddPlayerPrestige1779970000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE player_levels
        ADD COLUMN IF NOT EXISTS prestige_level INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS prestige_xp INTEGER NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE player_levels
        DROP COLUMN IF EXISTS prestige_level,
        DROP COLUMN IF EXISTS prestige_xp
    `);
  }
}
