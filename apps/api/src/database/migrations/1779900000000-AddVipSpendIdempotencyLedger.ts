import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Defense-in-depth layer 2 for ECON-PAY-COMPLETETX-NO-IDEMPOTENCY
 * (audit cycle 6).
 *
 * Background — what was broken
 * ─────────────────────────────
 * PaymentService.completeTransaction had no `tx.status === 'completed'`
 * guard, so any re-entry on the same transactionId (Stripe webhook
 * resend after a crash, two concurrent /payment/mock/complete calls,
 * a future admin "re-grant" tool) re-invoked
 * vipService.recordPurchaseAndUpgradeVip → process_vip_spend()
 * accumulated the same purchase TWICE into user_vip_spending.
 * cumulative_spend_usd. That silently bumped the user's VIP tier
 * past where their real spend should put them — free tier
 * inflation, direct revenue impact.
 *
 * The service-level fix (early-return when status='completed') closes
 * the common case but not concurrent races where two callers both
 * findOne() the row before either save()s. We need a DB-level
 * one-shot.
 *
 * What this migration adds
 * ────────────────────────
 * 1. `vip_spend_ledger` table — one row per credited transaction with
 *    UNIQUE(transaction_id). This is the source-of-truth for "did we
 *    already credit this purchase?".
 *
 * 2. `process_vip_spend(p_user_id, p_spend_usd, p_transaction_id)` —
 *    new 3-arg overload. INSERT into vip_spend_ledger FIRST with ON
 *    CONFLICT (transaction_id) DO NOTHING; if no row was inserted,
 *    return early with already_credited=true and DO NOT bump
 *    cumulative_spend_usd. Concurrent callers serialise on the unique
 *    constraint — only the first commits.
 *
 * 3. Backfill: every already-completed transaction whose amount was
 *    credited under the old function gets a placeholder ledger row so
 *    a webhook replay after this migration deploys can't re-credit it.
 *
 * SAFETY NOTE — production replay
 * ────────────────────────────────
 * On the first deploy the backfill seeds vip_spend_ledger from
 * transactions WHERE status='completed'. Any historical webhook
 * replay (Stripe lets you resend up to 30 days back) will now hit
 * the unique constraint and be swallowed instead of double-crediting.
 *
 * The function keeps the 2-arg signature alive too so any in-flight
 * caller that hasn't been redeployed (game-server, batch jobs)
 * doesn't crash; the 2-arg path is best-effort (no idempotency) and
 * exists only for the deploy window.
 */
export class AddVipSpendIdempotencyLedger1779900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. UUID generator — use gen_random_uuid() (PostgreSQL 13+ core,
    //    no extension required) instead of uuid_generate_v4() which
    //    needs the uuid-ossp extension. The game-server bootstrap only
    //    installs pgcrypto; uuid-ossp is NOT guaranteed present on the
    //    api DB. Referencing a missing function in CREATE TABLE throws
    //    at boot → migrationsRun crashes the api → deploy crash-loop.
    //    gen_random_uuid() is shipped in PostgreSQL core since 13 (the
    //    stack is PG17) so this is dependency-free. pgcrypto is also
    //    created defensively for any PG<13 edge case.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    // 1. Ledger table — UNIQUE(transaction_id) is the linchpin.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vip_spend_ledger (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL,
        transaction_id  UUID NOT NULL,
        spend_usd       NUMERIC(12,2) NOT NULL CHECK (spend_usd >= 0),
        credited_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT vip_spend_ledger_transaction_unique UNIQUE (transaction_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_vip_spend_ledger_user
         ON vip_spend_ledger(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_vip_spend_ledger_credited
         ON vip_spend_ledger(credited_at DESC)`,
    );

    // 2. Backfill — every historical completed transaction gets a
    //    ledger row so post-deploy webhook replays can't double-credit.
    //    Use ON CONFLICT DO NOTHING in case the migration re-runs
    //    (typeorm tracks executed migrations but defensive coding
    //    here is cheap).
    //
    //    Wrapped in a DO/EXCEPTION block: the backfill is a best-effort
    //    data seed, NOT a schema change the app depends on. If the
    //    `transactions` table or one of its columns is missing/diverged
    //    on a given environment, a RAISE NOTICE is logged but the
    //    migration completes — the worst case is one extra credit on a
    //    historical webhook replay, vs. crash-looping the api boot for
    //    the whole fleet (which is what happened cycles 11-15).
    await queryRunner.query(`
      DO $$
      BEGIN
        INSERT INTO vip_spend_ledger (user_id, transaction_id, spend_usd, credited_at)
        SELECT
          t.user_id,
          t.id AS transaction_id,
          COALESCE(t.amount_usd, t.amount_try * 0.0285, 0)::NUMERIC(12,2) AS spend_usd,
          COALESCE(t.updated_at, t.created_at) AS credited_at
        FROM transactions t
        WHERE t.status = 'completed'
        ON CONFLICT (transaction_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'vip_spend_ledger backfill skipped: %', SQLERRM;
      END $$;
    `);

    // 3. New 3-arg process_vip_spend overload (transaction_id required).
    //    The ledger INSERT runs BEFORE the cumulative-spend bump and
    //    short-circuits if the transaction_id was already credited.
    //    Concurrent callers serialise on the UNIQUE constraint — only
    //    the first INSERT succeeds, the others fall through to the
    //    early-return branch.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION process_vip_spend(
          p_user_id        UUID,
          p_spend_usd      NUMERIC(12,2),
          p_transaction_id UUID
      ) RETURNS TABLE(
          new_vip_level    SMALLINT,
          old_vip_level    SMALLINT,
          total_spend      NUMERIC(12,2),
          upgraded         BOOLEAN,
          already_credited BOOLEAN
      ) LANGUAGE plpgsql AS $$
      DECLARE
          v_old_level   SMALLINT;
          v_new_level   SMALLINT;
          v_total_spend NUMERIC(12,2);
          v_rowcount    INTEGER := 0;
      BEGIN
          -- Layer 2 idempotency: claim this transaction_id in the ledger
          -- before touching cumulative_spend_usd. UNIQUE(transaction_id)
          -- serialises concurrent calls — only the first commits the row.
          IF p_transaction_id IS NOT NULL THEN
              INSERT INTO vip_spend_ledger (user_id, transaction_id, spend_usd)
              VALUES (p_user_id, p_transaction_id, p_spend_usd)
              ON CONFLICT (transaction_id) DO NOTHING;

              GET DIAGNOSTICS v_rowcount = ROW_COUNT;

              IF v_rowcount = 0 THEN
                  -- Already credited. Return the player's current
                  -- snapshot without bumping anything.
                  SELECT vip_level, cumulative_spend_usd
                    INTO v_old_level, v_total_spend
                    FROM user_vip_spending
                   WHERE user_id = p_user_id;

                  IF v_old_level IS NULL THEN
                      v_old_level   := 0;
                      v_total_spend := 0;
                  END IF;

                  RETURN QUERY SELECT
                    v_old_level, v_old_level, v_total_spend,
                    false::BOOLEAN, true::BOOLEAN;
                  RETURN;
              END IF;
          END IF;

          -- First time crediting this transaction (or caller passed
          -- NULL transaction_id, e.g. an admin grant). Run the original
          -- accumulate-and-upgrade flow.
          INSERT INTO user_vip_spending (user_id, cumulative_spend_usd, vip_level)
          VALUES (p_user_id, p_spend_usd, 0)
          ON CONFLICT (user_id) DO UPDATE
              SET cumulative_spend_usd = user_vip_spending.cumulative_spend_usd + p_spend_usd,
                  updated_at           = NOW()
          RETURNING cumulative_spend_usd, vip_level
          INTO v_total_spend, v_old_level;

          SELECT COALESCE(MAX(vtc.vip_level), 0)
            INTO v_new_level
            FROM vip_tier_config vtc
           WHERE vtc.is_active = true
             AND vtc.min_spend_usd <= v_total_spend;

          IF v_new_level > v_old_level THEN
              UPDATE user_vip_spending
                 SET vip_level        = v_new_level,
                     last_upgraded_at = NOW(),
                     updated_at       = NOW()
               WHERE user_id = p_user_id;
          END IF;

          RETURN QUERY SELECT
            v_new_level, v_old_level, v_total_spend,
            (v_new_level > v_old_level)::BOOLEAN,
            false::BOOLEAN;
      END;
      $$;
    `);

    // 4. Keep the legacy 2-arg overload alive for the deploy window so
    //    any in-flight container that hasn't been redeployed yet (or
    //    out-of-band callers) doesn't crash with
    //    "function process_vip_spend(uuid, numeric) does not exist".
    //    Forwards to the 3-arg variant with NULL transaction_id — the
    //    accumulate-and-upgrade path still runs, just without
    //    idempotency. Drop this overload once all services are on the
    //    3-arg call site.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION process_vip_spend(
          p_user_id        UUID,
          p_spend_usd      NUMERIC(12,2)
      ) RETURNS TABLE(
          new_vip_level    SMALLINT,
          old_vip_level    SMALLINT,
          total_spend      NUMERIC(12,2),
          upgraded         BOOLEAN
      ) LANGUAGE plpgsql AS $$
      DECLARE
          v_row RECORD;
      BEGIN
          SELECT * INTO v_row
            FROM process_vip_spend(p_user_id, p_spend_usd, NULL::UUID);
          RETURN QUERY SELECT
            v_row.new_vip_level,
            v_row.old_vip_level,
            v_row.total_spend,
            v_row.upgraded;
      END;
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the original 2-arg process_vip_spend (from
    // 007_vip_system.sql) and drop the 3-arg overload + ledger.
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS process_vip_spend(UUID, NUMERIC, UUID)`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS process_vip_spend(UUID, NUMERIC)`,
    );
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION process_vip_spend(
          p_user_id        UUID,
          p_spend_usd      NUMERIC(12,2)
      ) RETURNS TABLE(
          new_vip_level    SMALLINT,
          old_vip_level    SMALLINT,
          total_spend      NUMERIC(12,2),
          upgraded         BOOLEAN
      ) LANGUAGE plpgsql AS $$
      DECLARE
          v_old_level   SMALLINT;
          v_new_level   SMALLINT;
          v_total_spend NUMERIC(12,2);
      BEGIN
          INSERT INTO user_vip_spending (user_id, cumulative_spend_usd, vip_level)
          VALUES (p_user_id, p_spend_usd, 0)
          ON CONFLICT (user_id) DO UPDATE
              SET cumulative_spend_usd = user_vip_spending.cumulative_spend_usd + p_spend_usd,
                  updated_at           = NOW()
          RETURNING cumulative_spend_usd, vip_level
          INTO v_total_spend, v_old_level;

          SELECT COALESCE(MAX(vtc.vip_level), 0)
            INTO v_new_level
            FROM vip_tier_config vtc
           WHERE vtc.is_active = true
             AND vtc.min_spend_usd <= v_total_spend;

          IF v_new_level > v_old_level THEN
              UPDATE user_vip_spending
                 SET vip_level        = v_new_level,
                     last_upgraded_at = NOW(),
                     updated_at       = NOW()
               WHERE user_id = p_user_id;
          END IF;

          RETURN QUERY SELECT v_new_level, v_old_level, v_total_spend, (v_new_level > v_old_level);
      END;
      $$;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS vip_spend_ledger`);
  }
}
