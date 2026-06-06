import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HIGH CYCLE12-01 — one-shot cleanup for orphaned pending transactions
 * ────────────────────────────────────────────────────────────────────
 * Companion migration to the runtime guard added in
 * PaymentService.completeTransaction (audit cycle 12).
 *
 * Why this exists
 * ───────────────
 * Migration 1779915000000-AddTransactionFulfillmentFields added the
 * item_sku / pass_code / quantity / *_delta columns to the transactions
 * table but did NOT backfill them on pre-existing rows.  Any
 * transaction row created BEFORE that migration with status='pending'
 * still carries item_sku=NULL and pass_code=NULL — there's no
 * recoverable fulfillment spec.
 *
 * If one of those stale rows ever receives a late webhook
 * (Stripe replays up to 30 days; iyzico retries on 5xx) it would:
 *   1. flip status='pending' → 'completed'
 *   2. credit VIP cumulative_spend_usd (bumping tier)
 *   3. walk deliverPurchase with zero/null deltas → credit NOTHING
 *   4. inventory: no row inserted (itemSku NULL)
 *   5. pass: no row inserted (passCode NULL)
 *
 * The runtime guard in completeTransaction catches step 1 and throws
 * InternalServerErrorException, leaving the row pending.  That's
 * defense for the future.  This migration is the broom: any orphan
 * older than 1 hour that was minted before the spec contract is
 * cancelled outright.  Stripe/Iyzico would have completed valid
 * payments long before the 1-hour window — anything still pending is
 * a definite orphan (intent abandoned by the user, or pre-cycle-12
 * row with no spec).
 *
 * Why 1 hour
 * ──────────
 * Stripe paymentIntents auto-expire at 24 hours but most checkouts
 * complete within seconds.  Iyzico checkout-form sessions expire at
 * 30 minutes.  A 1-hour cutoff is conservative: a real in-flight
 * payment finishes faster, but we still give a generous slack for
 * slow networks / user pauses on the payment page.  The condition
 * also requires BOTH item_sku and pass_code to be NULL, so it
 * specifically targets the pre-cycle-12 backlog and won't touch a
 * legitimately abandoned pending row that DOES have a spec (the
 * runtime path would credit those correctly if a webhook ever
 * arrives).
 *
 * Idempotency
 * ───────────
 * Re-running the migration is a no-op: the WHERE clause filters
 * status='pending' and post-UPDATE the rows are 'cancelled'.
 *
 * Reversibility
 * ─────────────
 * `down()` is intentionally a no-op.  We can't reconstruct the
 * fulfillment spec for these rows from anywhere — flipping their
 * status back to 'pending' would just re-open the silent-theft
 * window.  An operator who needs to unwind this MUST do so by hand
 * with the original conversation IDs and provider records, not via
 * migration rollback.
 */
export class CancelStalePendingTransactions1779920000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cancel pre-cycle-12 orphans: pending, older than 1h, AND no
    // fulfillment anchors.  notes column gets a marker so admins
    // browsing the table later can see why these were cancelled.
    const result = await queryRunner.query(
      `UPDATE transactions
          SET status     = 'cancelled',
              notes      = COALESCE(notes, '')
                           || ' [auto-cancelled by migration 1779920000000:'
                           || ' pre-cycle-12 orphan, no fulfillment spec,'
                           || ' pending > 1h]',
              updated_at = NOW()
        WHERE status = 'pending'
          AND created_at < (NOW() - INTERVAL '1 hour')
          AND item_sku IS NULL
          AND pass_code IS NULL
        RETURNING id`,
    );

    // TypeORM's query() returns the RETURNING rows as the first array
    // element (postgres driver).  Log the count for the migration audit
    // trail so an operator running `migration:run` sees how many rows
    // they just touched.
    const rowCount = Array.isArray(result) ? result.length : 0;
    // eslint-disable-next-line no-console
    console.log(
      `[migration 1779920000000] cancelled ${rowCount} stale pending transactions (pre-cycle-12 orphans).`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally no-op.  See JSDoc above: we cannot safely flip
    // these rows back to 'pending' because their fulfillment spec is
    // unrecoverable — doing so would re-arm the silent-theft window
    // the migration was created to close.
  }
}
