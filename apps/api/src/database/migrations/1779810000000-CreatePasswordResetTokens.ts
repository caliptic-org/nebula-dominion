import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `password_reset_tokens` table powering the forgot/reset
 * password flow. Token rows are insert-only — we mark them consumed by
 * stamping `used_at` instead of deleting, so we can audit reset attempts
 * and so a re-used token has a distinct "already used" failure mode.
 *
 * Idempotent: `IF NOT EXISTS` makes this safe to re-run.
 */
export class CreatePasswordResetTokens1779810000000 implements MigrationInterface {
  name = 'CreatePasswordResetTokens1779810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
        id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
        user_id uuid NOT NULL,
        token character varying(128) NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        expires_at timestamp with time zone NOT NULL,
        used_at timestamp with time zone,
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY (id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_token"
        ON public.password_reset_tokens USING btree (token)
    `);
    // Reset lookups need a path from user_id to outstanding tokens for
    // cleanup jobs, and the cardinality is low — cheap supporting index.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_user_id"
        ON public.password_reset_tokens USING btree (user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_password_reset_tokens_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_password_reset_tokens_token"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS public.password_reset_tokens`);
  }
}
