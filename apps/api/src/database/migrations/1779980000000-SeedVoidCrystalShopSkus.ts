import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Give `void_crystals` a spend path (ECON cleanup item #4 / cycle 27).
 *
 * void_crystals had THREE live faucets — battle-pass tier rewards
 * (premium.service), subspace zone completion (subspace.service), and the
 * real-money delivery path (payment.service) — but ZERO sinks: not a single
 * shop_item carried a price_void_crystals, so the currency minted forever and
 * could never be spent. A dead currency that accumulates and does nothing is a
 * playability flaw (players hoard a number that buys nothing).
 *
 * The spend infrastructure already exists end-to-end:
 *   ShopService.purchaseWithInGameCurrency maps currencyType='void_crystals'
 *   → price_void_crystals + an atomic FOR UPDATE debit of user_currency
 *   .void_crystals. It just needed priced items to point at.
 *
 * This seeds a small VOID-themed catalogue. Deliberately COSMETIC +
 * soft-convenience only (skin / frame / XP booster) — void_crystals comes from
 * premium/endgame activity, so pricing power (resources, units) in it would
 * create a grind→power-creep channel. Cosmetics drain the currency without
 * touching combat/economy balance.
 *
 * Prices track the faucet rate (subspace Omega ≈ 500/run, battle-pass tiers
 * 50–200): a frame is a couple of runs, the headline skin a longer chase.
 *
 * SKUs match the FE PRODUCTS ids in apps/web/src/app/shop/page.tsx so
 * POST /shop/purchase resolves. ON CONFLICT keeps it idempotent (the api runs
 * migrationsRun:true on boot — a duplicate seed must be a no-op, not a crash).
 */
export class SeedVoidCrystalShopSkus1779980000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO shop_items
        (sku, name, description, category, rarity,
         price_nebula_coins, price_premium_gems, price_void_crystals,
         content, is_limited, limited_stock, stock_remaining,
         is_active, sort_order)
      VALUES
        ('void-skin-singularity', 'Tekillik Komutan Skini',
         'Boşluk Kristali ile alınan efsanevi komutan görünümü',
         'cosmetic_skin', 'legendary',
         NULL, NULL, 1200,
         '{"commander_skin": "void_singularity"}'::jsonb,
         false, NULL, NULL,
         true, 600),

        ('void-frame-eclipse', 'Tutulma Çerçevesi',
         'Boşluk temalı profil çerçevesi ve yarık efekti',
         'cosmetic_avatar_frame', 'epic',
         NULL, NULL, 500,
         '{"frame": "void_eclipse", "effect": "void_rift"}'::jsonb,
         false, NULL, NULL,
         true, 610),

        ('void-xp-surge', 'Boşluk XP Dalgası',
         '2x XP kazanımı 24 saat boyunca',
         'xp_booster', 'epic',
         NULL, NULL, 600,
         '{"multiplier": 2, "duration_hours": 24}'::jsonb,
         false, NULL, NULL,
         true, 620)
      ON CONFLICT (sku) DO UPDATE SET
        name                = EXCLUDED.name,
        description         = EXCLUDED.description,
        category            = EXCLUDED.category,
        rarity              = EXCLUDED.rarity,
        price_nebula_coins  = EXCLUDED.price_nebula_coins,
        price_premium_gems  = EXCLUDED.price_premium_gems,
        price_void_crystals = EXCLUDED.price_void_crystals,
        content             = EXCLUDED.content,
        is_active           = EXCLUDED.is_active,
        sort_order          = EXCLUDED.sort_order,
        updated_at          = NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM shop_items
       WHERE sku IN (
         'void-skin-singularity', 'void-frame-eclipse', 'void-xp-surge'
       )
    `);
  }
}
