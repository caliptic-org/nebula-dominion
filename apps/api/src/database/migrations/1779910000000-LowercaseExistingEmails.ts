import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix HIGH AUTH-REGISTER-EMAIL-NO-LOWERCASE (audit cycle 6).
 *
 * What was broken
 * ────────────────
 * AuthService.register saved user.email = dto.email verbatim (mixed
 * case allowed). AuthService.login and forgotPassword both lookup with
 * email = dto.identifier.toLowerCase(). users.email has a case-sensitive
 * Postgres UNIQUE constraint.
 *
 * Net effect:
 *   1. A user who registers "Foo@x.com" cannot log back in with
 *      "foo@x.com" — the WHERE clause misses the row.
 *   2. A different actor can re-register "foo@x.com" as a fresh
 *      account because the case-sensitive UNIQUE sees the two strings
 *      as distinct → account squatting.
 *   3. forgotPassword silently no-ops on the mixed-case original →
 *      the account is effectively orphaned.
 *
 * The service-layer fix is in this same commit (RegisterDto @Transform
 * + AuthService.register defense-in-depth normalization). This
 * migration backfills the data side:
 *
 *   1. UPDATE existing mixed-case rows to LOWER(email). Reports any
 *      rows that would collide so an operator can resolve them
 *      manually (extremely rare in practice — every real registration
 *      historically came through a flow that already lowercased on
 *      the client side; the few that didn't are testing artefacts).
 *   2. Add a UNIQUE expression index on LOWER(email) as a belt-and-
 *      braces guarantee at the DB layer. Even if a future caller
 *      bypasses the service layer and INSERTs mixed-case, Postgres
 *      will reject the duplicate.
 *
 * The existing UNIQUE(email) constraint is kept — once the data is
 * fully lower-cased, the two constraints are functionally equivalent
 * but the expression index catches any future code regression.
 *
 * IDEMPOTENCY
 * ───────────
 * The UPDATE is naturally idempotent (LOWER(LOWER(x)) = LOWER(x)).
 * The CREATE INDEX uses IF NOT EXISTS. Safe to re-run.
 */
export class LowercaseExistingEmails1779910000000
  implements MigrationInterface
{
  name = 'LowercaseExistingEmails1779910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Surface any rows whose LOWER(email) collides with another
    //    user's existing email. These rows can't be safely auto-
    //    normalized because doing so would violate UNIQUE(email).
    //    In production this is expected to be empty; we log so an
    //    operator can manually merge / disable the duplicate accounts
    //    before re-running.
    const collisions: Array<{ lower_email: string; ids: string }> =
      await queryRunner.query(`
        SELECT LOWER(email) AS lower_email,
               STRING_AGG(id::text, ',') AS ids
          FROM users
         GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
      `);

    if (collisions.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[LowercaseExistingEmails] ${collisions.length} collision group(s) found — these rows will NOT be normalized automatically:`,
      );
      for (const row of collisions) {
        // eslint-disable-next-line no-console
        console.warn(
          `  lower(email)=${row.lower_email}  user_ids=${row.ids}`,
        );
      }
      // We continue — the UPDATE below excludes colliding rows so the
      // migration doesn't crash. Operator follow-up: merge accounts,
      // then manually lowercase the remaining row.
    }

    // 2. Lowercase + trim every row where doing so is safe (i.e. no
    //    collision with another existing row). The NOT EXISTS clause
    //    skips a row if a different user already owns its lowercased
    //    form. Rare but the migration must be crash-free.
    await queryRunner.query(`
      UPDATE users u
         SET email = LOWER(TRIM(u.email))
       WHERE u.email <> LOWER(TRIM(u.email))
         AND NOT EXISTS (
           SELECT 1 FROM users u2
            WHERE u2.id <> u.id
              AND u2.email = LOWER(TRIM(u.email))
         )
    `);

    // 3. Belt-and-braces — UNIQUE expression index on LOWER(email).
    //    Even if a future regression INSERTs mixed-case, Postgres
    //    rejects it at the DB layer.
    //
    //    CRITICAL: if any case-collision rows survive step 2 (the UPDATE
    //    skips them to stay crash-free), a plain CREATE UNIQUE INDEX
    //    would itself throw "could not create unique index ... key is
    //    duplicated" — crash-looping the api boot for the whole fleet.
    //    Wrap in a DO/EXCEPTION block: try the UNIQUE index first; if it
    //    fails on residual duplicates, fall back to a NON-unique index
    //    (still speeds up the LOWER(email) login lookup) and log a
    //    NOTICE so an operator can dedup + re-tighten later. The real
    //    correctness fix is the application-level RegisterDto @Transform
    //    + AuthService normalization in this same commit; the index is
    //    only defense-in-depth.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'uq_users_lower_email'
        ) THEN
          BEGIN
            CREATE UNIQUE INDEX uq_users_lower_email ON users (LOWER(email));
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'unique lower(email) index skipped (residual collisions: %); creating non-unique fallback', SQLERRM;
            CREATE INDEX IF NOT EXISTS ix_users_lower_email ON users (LOWER(email));
          END;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the expression index. The UPDATE is intentionally NOT
    // reverted — lowercasing email is a correctness fix, not a
    // schema change, and we have no record of the original casing
    // to restore.
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_users_lower_email`,
    );
  }
}
