import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed VIP-pass SKUs into `shop_items` so the /shop VIP tab can actually
 * sell something.
 *
 * The audit (workflow wf_cea4d7f7-3f1, finding A7) caught that the FE
 * POSTs `/shop/purchase` with `sku: vip_<plan-id>` (e.g.
 * `vip_vip-monthly`) — but those SKUs were never seeded. Every "Yükselt"
 * click returned 404 "İtem 'vip_vip-monthly' bulunamadı".
 *
 * VIP plans match apps/web/src/app/shop/page.tsx VIP_PLANS:
 *   vip-monthly   → 30  days, 1000 gems
 *   vip-quarterly → 90  days, 2500 gems + 200 bonus_gems
 *   vip-annual    → 365 days, 8000 gems + 1000 bonus_gems
 *
 * Category `premium_pass` triggers the post-purchase VIP upgrade hook
 * in shop.service.ts (see paired commit). The hook calls
 * VipService.recordPurchaseAndUpgradeVip with the equivalent USD value
 * (gem price ≈ USD, fudgeable) so the user's VIP level actually steps
 * up; without the hook the shop_items row exists but the player gets
 * an inventory record and no tier bump.
 */
export class SeedVipShopSkus1779860000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO shop_items
        (sku, name, description, category, rarity,
         price_premium_gems, price_real_usd, content,
         is_limited)
      VALUES
        ('vip_vip-monthly', 'VIP Aylık',
         '30 gün VIP üyelik — günlük login bonus, ekstra queue slot, kozmetik avantajlar.',
         'premium_pass', 'rare',
         1000, 9.99,
         '{"vip_days": 30, "bonus_gems": 0}'::jsonb,
         false),
        ('vip_vip-quarterly', 'VIP 3 Aylık',
         '90 gün VIP üyelik + 200 bonus Kristal.',
         'premium_pass', 'epic',
         2500, 24.99,
         '{"vip_days": 90, "bonus_gems": 200}'::jsonb,
         false),
        ('vip_vip-annual', 'VIP Yıllık',
         '365 gün VIP üyelik + 1000 bonus Kristal — en iyi değer.',
         'premium_pass', 'legendary',
         8000, 79.99,
         '{"vip_days": 365, "bonus_gems": 1000}'::jsonb,
         false)
      ON CONFLICT (sku) DO UPDATE SET
        name              = EXCLUDED.name,
        description       = EXCLUDED.description,
        category          = EXCLUDED.category,
        rarity            = EXCLUDED.rarity,
        price_premium_gems = EXCLUDED.price_premium_gems,
        price_real_usd    = EXCLUDED.price_real_usd,
        content           = EXCLUDED.content,
        updated_at        = NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM shop_items
       WHERE sku IN ('vip_vip-monthly', 'vip_vip-quarterly', 'vip_vip-annual')
    `);
  }
}
