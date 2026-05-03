import { MigrationInterface, QueryRunner } from 'typeorm';

export class VipSchema1746700000000 implements MigrationInterface {
  name = 'VipSchema1746700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vip_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        plan_id VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vip_subscriptions_user_id ON vip_subscriptions (user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vip_subscriptions_user_status ON vip_subscriptions (user_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vip_subscriptions_expires_at ON vip_subscriptions (expires_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vip_daily_claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        claimed_at TIMESTAMPTZ NOT NULL,
        rewards JSONB NOT NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vip_daily_claims_user_id ON vip_daily_claims (user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vip_daily_claims_user_claimed ON vip_daily_claims (user_id, claimed_at DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS vip_daily_claims`);
    await queryRunner.query(`DROP TABLE IF EXISTS vip_subscriptions`);
  }
}
