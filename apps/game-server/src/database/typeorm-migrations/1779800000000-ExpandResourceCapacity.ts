import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Expand resource columns so Lv 54 upgrade costs actually fit.
 *
 * The original schema used `numeric(12,4)` for the four resource fields
 * (mineral/gas/energy/science) and `integer` for the four caps. That
 * topped out at ~99 999 999 (≈99M) per ledger entry — fine for Çağ 1
 * pacing where buildings cost a few hundred minerals each, but
 * catastrophic for endgame:
 *   factory.cost.mineral × 1.5^53  ≈  250 × 4.4·10^9  ≈  1.1 trillion
 * That's 4 orders of magnitude over the old precision; insert would
 * raise `numeric field overflow` and the upgrade POST 500'd silently.
 *
 * New shape:
 *   - resource amounts: numeric(20,4)  → max ~10^16  (≈10 quadrillion)
 *   - cap columns:      bigint         → max 9.2·10^18
 *   - default cap:      10 000 000 000 000  (10T) for all four
 *
 * Existing rows: data stays as-is, precision just grows. ALTER COLUMN
 * TYPE on a wider numeric is a metadata-only change for any value that
 * already fits — no table rewrite, no row locking.
 *
 * Defaults: bumped to 10T on the cap columns so newly-created accounts
 * never hit the ceiling during playtest. The amount columns keep their
 * starter defaults (500/200/250/0 from BumpStarterResources) — caps
 * matter for the WHERE-clause-based "are we maxed" check, not for the
 * initial wallet balance.
 *
 * Companion entity update lives in resource.entity.ts (same commit).
 */
export class ExpandResourceCapacity1779800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Amount columns — widen precision ──────────────────────────────────
    for (const col of ['mineral', 'gas', 'energy', 'science', 'population']) {
      await queryRunner.query(
        `ALTER TABLE "player_resources" ALTER COLUMN "${col}" TYPE numeric(20, 4)`,
      );
    }
    // per-tick columns too — production rate at Lv 54 can also overflow
    // the old (10, 4) precision when stacked from multiple buildings.
    for (const col of [
      'mineral_per_tick',
      'gas_per_tick',
      'energy_per_tick',
      'population_per_tick',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "player_resources" ALTER COLUMN "${col}" TYPE numeric(20, 4)`,
      );
    }

    // ── Cap columns — integer → bigint ────────────────────────────────────
    for (const col of [
      'mineral_cap',
      'gas_cap',
      'energy_cap',
      'population_cap',
      'science_cap',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "player_resources" ALTER COLUMN "${col}" TYPE bigint USING "${col}"::bigint`,
      );
    }

    // ── New defaults — 10T cap across the board ───────────────────────────
    const NEW_CAP = '10000000000000'; // 10 trillion
    for (const col of ['mineral_cap', 'gas_cap', 'energy_cap', 'science_cap']) {
      await queryRunner.query(
        `ALTER TABLE "player_resources" ALTER COLUMN "${col}" SET DEFAULT ${NEW_CAP}`,
      );
    }
    // population stays at 5000 — it's a soldier-count not a currency,
    // story-bible doesn't push it past a few thousand. Excluded from
    // the bump to keep gameplay intent intact.

    // Bump existing rows' caps so old accounts can also hold trillion-
    // tier balances without re-registering. GREATEST keeps anyone who
    // somehow already exceeds 10T untouched (impossible today, defensive).
    await queryRunner.query(`
      UPDATE "player_resources" SET
        "mineral_cap" = GREATEST("mineral_cap", ${NEW_CAP}),
        "gas_cap"     = GREATEST("gas_cap",     ${NEW_CAP}),
        "energy_cap"  = GREATEST("energy_cap",  ${NEW_CAP}),
        "science_cap" = GREATEST("science_cap", ${NEW_CAP})
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down-migration only revert SCHEMA defaults — narrowing numeric
    // precision back to (12,4) would refuse rows that already exceed
    // 99M, and bigint→integer would clip. Leave widened columns alone
    // on revert; the schema is forward-compatible.
    for (const col of ['mineral_cap', 'gas_cap', 'energy_cap']) {
      // Restore pre-bump entity defaults.
      const prev = col === 'mineral_cap' ? 24000 : col === 'gas_cap' ? 14400 : 8400;
      await queryRunner.query(
        `ALTER TABLE "player_resources" ALTER COLUMN "${col}" SET DEFAULT ${prev}`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "player_resources" ALTER COLUMN "science_cap" SET DEFAULT 999999`,
    );
  }
}
