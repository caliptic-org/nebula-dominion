import { MigrationInterface, QueryRunner } from 'typeorm';

export class MailSchema1746900000000 implements MigrationInterface {
  name = 'MailSchema1746900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE mail_type_enum AS ENUM ('system', 'battle_report', 'guild', 'event');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        type mail_type_enum NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        sender VARCHAR(255) NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        rewards JSONB,
        rewards_claimed BOOLEAN NOT NULL DEFAULT FALSE,
        rewards_claimed_at TIMESTAMPTZ,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_mails_user_deleted ON mails(user_id, deleted_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_mails_user_type ON mails(user_id, type)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_mails_user_is_read ON mails(user_id, is_read)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_mails_user_sent_at ON mails(user_id, sent_at DESC)`,
    );

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_mails_updated_at ON mails;
      CREATE TRIGGER update_mails_updated_at
        BEFORE UPDATE ON mails
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_mails_updated_at ON mails`);
    await queryRunner.query(`DROP TABLE IF EXISTS mails`);
    await queryRunner.query(`DROP TYPE IF EXISTS mail_type_enum`);
  }
}
