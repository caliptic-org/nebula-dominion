import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed the FE shop product catalog into `shop_items` so the /shop page
 * (Genel, Lonca, Etkinlik tabs + Battle Pass section) can complete
 * `/shop/purchase` calls without 404.
 *
 * Audit cycle 6 caught that `apps/web/src/app/shop/page.tsx` PRODUCTS
 * uses 15 SKUs (gem-small, gem-medium, gem-large, xp-booster,
 * resource-pack, shield-8h, speed-boost, race-bundle, lonca-kaynak,
 * lonca-gelistirme, lonca-tech, event-frame, event-explorer,
 * event-galaxy) plus the BattlePassSection (battle_pass_premium) that
 * were never seeded. Only the legacy gems_* / xp_boost_1h test SKUs
 * from InitialSchema and the VIP SKUs from
 * 1779860000000-SeedVipShopSkus existed, so every non-VIP tap returned
 * 404 "İtem '<sku>' bulunamadı" from ShopService.purchaseWithInGameCurrency.
 *
 * Pricing & content payloads mirror the FE catalog exactly:
 *   gemPrice  → price_premium_gems  (FE sends currencyType=premium_gems
 *                                    when useGem is true)
 *   goldPrice → price_nebula_coins  (FE sends currencyType=nebula_coins
 *                                    otherwise)
 *
 * Category picks from shop_items_category_enum:
 *   gem-small/medium/large → currency_bundle  (raw gem grants)
 *   xp-booster             → xp_booster
 *   resource-pack          → resource_pack
 *   shield-8h, speed-boost,
 *   race-bundle, lonca-*   → unit_boost (gameplay-affecting consumables)
 *   event-frame            → cosmetic_avatar_frame
 *   event-explorer         → currency_bundle (mixed frame + booster pack)
 *   event-galaxy           → cosmetic_skin (commander skin headline)
 *   battle_pass_premium    → battle_pass_tier_skip
 *
 * Note: battle_pass_premium is deliberately NOT category=premium_pass
 * because ShopService.purchaseWithInGameCurrency fires a VIP-upgrade
 * hook for that category (see 1779860000000-SeedVipShopSkus header).
 * A battle-pass purchase must not bump VIP tier — battle_pass_tier_skip
 * is the closest enum value that grants the entitlement without the
 * VIP side-effect.
 *
 * Limited-stock SKUs (race-bundle, event-frame, event-explorer,
 * event-galaxy) set is_limited=true plus limited_stock/stock_remaining
 * so the stock guard inside the purchase transaction takes effect.
 */
export class SeedShopProductSkus1779890000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO shop_items
        (sku, name, description, category, rarity,
         price_nebula_coins, price_premium_gems,
         content, is_limited, limited_stock, stock_remaining,
         is_active, sort_order)
      VALUES
        -- ── Genel: currency bundles (gem packs sold for nebula_coins) ──
        ('gem-small', 'Kristal Paketi',
         '100 Nebula Kristali',
         'currency_bundle', 'common',
         800, NULL,
         '{"premium_gems": 100}'::jsonb,
         false, NULL, NULL,
         true, 100),

        ('gem-medium', 'Kristal Demeti',
         '550 Kristal (500 + 50 bonus)',
         'currency_bundle', 'rare',
         4000, NULL,
         '{"premium_gems": 500, "bonus_gems": 50}'::jsonb,
         false, NULL, NULL,
         true, 110),

        ('gem-large', 'Kristal Hazinesi',
         '1440 Kristal (1200 + 240 bonus) ve özel çerçeve',
         'currency_bundle', 'epic',
         9000, NULL,
         '{"premium_gems": 1200, "bonus_gems": 240, "frame": "treasure"}'::jsonb,
         false, NULL, NULL,
         true, 120),

        -- ── Genel: XP & resource consumables ──
        ('xp-booster', 'XP Uyarıcı',
         '2x XP kazanımı 24 saat boyunca',
         'xp_booster', 'rare',
         1600, 200,
         '{"multiplier": 2, "duration_hours": 24}'::jsonb,
         false, NULL, NULL,
         true, 200),

        ('resource-pack', 'Kaynak Paketi',
         '1.000 Mineral, 500 Gas, 300 Energy',
         'resource_pack', 'common',
         1200, 150,
         '{"mineral": 1000, "gas": 500, "energy": 300}'::jsonb,
         false, NULL, NULL,
         true, 210),

        ('shield-8h', 'Savaş Kalkanı',
         '8 saatlik saldırı koruması',
         'unit_boost', 'common',
         640, 80,
         '{"shield_hours": 8}'::jsonb,
         false, NULL, NULL,
         true, 220),

        ('speed-boost', 'Hız Katalizörü',
         'Tüm üretimleri 1 saat anında tamamlar',
         'unit_boost', 'common',
         400, 50,
         '{"instant_production_hours": 1}'::jsonb,
         false, NULL, NULL,
         true, 230),

        -- ── Genel: limited race-exclusive bundle (50 stock) ──
        ('race-bundle', 'Irk Paketi',
         'Aktif ırka özel güç paketi: çerçeve, hızlandırıcı, kalkan ve kaynak',
         'unit_boost', 'epic',
         NULL, 500,
         '{"race_frame": true, "speedups": 5, "shields": 2, "mineral": 500, "gas": 300}'::jsonb,
         true, 50, 50,
         true, 240),

        -- ── Lonca tab ──
        ('lonca-kaynak', 'Lonca Kaynağı',
         '5.000 Lonca Minerali, 2.500 Lonca Gazı',
         'resource_pack', 'rare',
         2400, 300,
         '{"guild_mineral": 5000, "guild_gas": 2500}'::jsonb,
         false, NULL, NULL,
         true, 300),

        ('lonca-gelistirme', 'Geliştirme Paketi',
         'Lonca Ar-Ge x2, Lonca Puanı x1000',
         'unit_boost', 'rare',
         NULL, 500,
         '{"guild_rd_multiplier": 2, "guild_points": 1000}'::jsonb,
         false, NULL, NULL,
         true, 310),

        ('lonca-tech', 'Teknoloji Hızlandırıcı',
         'Lonca araştırma hızlandırıcı x5',
         'unit_boost', 'rare',
         1600, 200,
         '{"research_speedups": 5}'::jsonb,
         false, NULL, NULL,
         true, 320),

        -- ── Etkinlik tab (limited stock) ──
        ('event-frame', 'Galaksi Çerçevesi',
         'Sınırlı kozmik profil çerçevesi ve yıldız efekti',
         'cosmetic_avatar_frame', 'epic',
         NULL, 100,
         '{"frame": "galaxy", "effect": "star"}'::jsonb,
         true, 200, 200,
         true, 400),

        ('event-explorer', 'Kaşif Paketi',
         'Kaşif çerçevesi ve 3x XP Booster',
         'currency_bundle', 'epic',
         NULL, 250,
         '{"frame": "explorer", "xp_boosters": 3}'::jsonb,
         true, 100, 100,
         true, 410),

        ('event-galaxy', 'Galaksi Fatihi',
         'Özel komutan skini, galaksi teması ve tüm ırk paketlerinden 5x',
         'cosmetic_skin', 'legendary',
         NULL, 800,
         '{"commander_skin": "galaxy_conqueror", "theme": "galaxy", "race_bundles": 5}'::jsonb,
         true, 25, 25,
         true, 420),

        -- ── Savaş Geçişi: premium battle pass ──
        ('battle_pass_premium', 'Premium Savaş Geçişi',
         'Mevcut sezonun premium ödüllerini açar',
         'battle_pass_tier_skip', 'legendary',
         NULL, 800,
         '{"unlock_premium_track": true, "season_scope": "current"}'::jsonb,
         false, NULL, NULL,
         true, 500)
      ON CONFLICT (sku) DO UPDATE SET
        name                = EXCLUDED.name,
        description         = EXCLUDED.description,
        category            = EXCLUDED.category,
        rarity              = EXCLUDED.rarity,
        price_nebula_coins  = EXCLUDED.price_nebula_coins,
        price_premium_gems  = EXCLUDED.price_premium_gems,
        content             = EXCLUDED.content,
        is_limited          = EXCLUDED.is_limited,
        limited_stock       = EXCLUDED.limited_stock,
        -- Preserve in-flight stock_remaining if the row already had it
        -- depleted (e.g. live re-runs). Only set on initial insert via
        -- COALESCE so we don't refill a half-sold limited drop.
        stock_remaining     = COALESCE(shop_items.stock_remaining, EXCLUDED.stock_remaining),
        is_active           = EXCLUDED.is_active,
        sort_order          = EXCLUDED.sort_order,
        updated_at          = NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM shop_items
       WHERE sku IN (
         'gem-small', 'gem-medium', 'gem-large',
         'xp-booster', 'resource-pack', 'shield-8h', 'speed-boost',
         'race-bundle',
         'lonca-kaynak', 'lonca-gelistirme', 'lonca-tech',
         'event-frame', 'event-explorer', 'event-galaxy',
         'battle_pass_premium'
       )
    `);
  }
}
