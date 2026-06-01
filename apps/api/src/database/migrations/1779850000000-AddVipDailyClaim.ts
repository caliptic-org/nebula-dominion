import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `last_daily_claim_at` to `user_vip_spending`.
 *
 * Backs the VIP daily-reward feature on /shop. The /vip/claim-daily endpoint
 * checks this column to gate the once-per-day reward (20h cooldown — slightly
 * under 24h so the reward floats with the player's local play time instead
 * of expiring at midnight). NULL means "never claimed; eligible immediately".
 */
export class AddVipDailyClaim1779820000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_vip_spending
        ADD COLUMN IF NOT EXISTS last_daily_claim_at TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_vip_spending
        DROP COLUMN IF EXISTS last_daily_claim_at
    `);
  }
}
