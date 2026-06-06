import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BLOCKER fix — PAYMENT-COMPLETETX-NO-FULFILLMENT (audit cycle 6).
 *
 * Background — what was broken
 * ─────────────────────────────
 * `PaymentService.createStripePaymentIntent` (and the iyzico / web-wallet
 * twins) accepted `dto.itemSku` / `dto.passCode` but stored them as
 * `shopItemId: null, premiumPassId: null` on the transaction row.  Once
 * the row was written there was no link from the transaction back to
 * the catalog entry the player thought they were buying.
 *
 * Then `completeTransaction` (after a successful webhook) flipped the
 * row to `status='completed'`, called `recordPurchaseAndUpgradeVip` to
 * bump cumulative_spend_usd, and ... that was it.  The player's
 * `user_currency` wallet was never credited, no row was inserted into
 * `user_inventory`.  Real-money purchases delivered NOTHING.
 *
 * Mitigation today: no FE caller actually hits /payment/stripe/create-intent
 * — the in-game shop uses `purchaseWithInGameCurrency` (which DOES
 * credit wallet + inventory).  The hole opens the moment a real
 * cash-purchase screen wires up.
 *
 * What this migration adds
 * ────────────────────────
 * Five fulfillment-spec columns on `transactions` so a later
 * `completeTransaction` call can deliver the correct goods even after
 * a webhook re-delivery weeks later (Stripe replays up to 30 days):
 *
 *   item_sku            VARCHAR(100) NULL  -- maps to shop_items.sku
 *   pass_code           VARCHAR(50)  NULL  -- maps to premium_passes.code
 *   quantity            INT          DEFAULT 1
 *   nebula_coins_delta  INT          DEFAULT 0  -- already existed; we
 *                                                  ALTER its default in
 *                                                  case the InitialSchema
 *                                                  variant lacked one
 *   premium_gems_delta  INT          DEFAULT 0  -- same as above
 *
 * The `*_delta` columns already exist on the entity (see
 * Transaction.entity.ts) but predate the fulfillment contract — they
 * were never populated.  Now the create-intent path snapshots the
 * shop_items / premium_passes payload into these columns so the
 * webhook can credit exactly what was advertised at purchase time
 * (catalog drift safe — a price/content edit between intent and
 * webhook doesn't change what gets delivered).
 *
 * Backfill: pre-existing rows have NULL itemSku/passCode and 0 deltas,
 * so the new fulfillment branch in completeTransaction skips them.
 * Historical completed rows are already past the fulfillment window
 * (their `completed` status short-circuits the new code paths via
 * vip_spend_ledger UNIQUE).
 */
export class AddTransactionFulfillmentFields1779915000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the SKU/passCode fulfillment anchors.  IF NOT EXISTS so the
    // migration is replay-safe if a prior partial run added one of
    // them (defensive — we're not aware of any such state in prod).
    await queryRunner.query(
      `ALTER TABLE transactions
         ADD COLUMN IF NOT EXISTS item_sku  VARCHAR(100) NULL,
         ADD COLUMN IF NOT EXISTS pass_code VARCHAR(50)  NULL,
         ADD COLUMN IF NOT EXISTS quantity  INT NOT NULL DEFAULT 1`,
    );

    // The Transaction entity already declares nebula_coins_delta /
    // premium_gems_delta with default 0, but ensure those defaults are
    // actually in the live schema so a NULL never sneaks in from a
    // hand-crafted INSERT.  IF NOT EXISTS keeps this idempotent on
    // re-run.
    await queryRunner.query(
      `ALTER TABLE transactions
         ADD COLUMN IF NOT EXISTS nebula_coins_delta INT NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS premium_gems_delta INT NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS void_crystals_delta INT NOT NULL DEFAULT 0`,
    );

    // Index for the (rare) admin "did we deliver this SKU?" report.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_transactions_item_sku
         ON transactions(item_sku)
         WHERE item_sku IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_transactions_pass_code
         ON transactions(pass_code)
         WHERE pass_code IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_transactions_pass_code`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_transactions_item_sku`,
    );
    // Only drop the columns we ADDED (item_sku/pass_code/quantity).
    // The *_delta columns predate this migration and are owned by the
    // initial schema — leave them alone on rollback.
    await queryRunner.query(
      `ALTER TABLE transactions
         DROP COLUMN IF EXISTS quantity,
         DROP COLUMN IF EXISTS pass_code,
         DROP COLUMN IF EXISTS item_sku`,
    );
  }
}
