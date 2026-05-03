import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlayerWalletSchema1746500000000 implements MigrationInterface {
  name = 'PlayerWalletSchema1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE player_wallets (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id         UUID        NOT NULL UNIQUE,
        resources         INTEGER     NOT NULL DEFAULT 0,
        rare_shards       INTEGER     NOT NULL DEFAULT 0,
        premium_currency  INTEGER     NOT NULL DEFAULT 0,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_player_wallets_player_id ON player_wallets(player_id)
    `);

    await queryRunner.query(`
      CREATE TRIGGER player_wallets_updated_at
        BEFORE UPDATE ON player_wallets
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS player_wallets CASCADE`);
  }
}
