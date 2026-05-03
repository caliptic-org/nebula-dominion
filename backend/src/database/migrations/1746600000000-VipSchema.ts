import { MigrationInterface, QueryRunner } from 'typeorm';

// VIP tiers from analysis spec (cumulative spend in cents USD)
const VIP_TIERS = [
  { vip_level: 1,  threshold_cents:      500, benefits: { queue_slots: 1, daily_login_bonus_pct: 5,  cosmetic_slot: false } },
  { vip_level: 2,  threshold_cents:     2000, benefits: { queue_slots: 1, daily_login_bonus_pct: 10, cosmetic_slot: false } },
  { vip_level: 3,  threshold_cents:     5000, benefits: { queue_slots: 2, daily_login_bonus_pct: 15, cosmetic_slot: false } },
  { vip_level: 4,  threshold_cents:    10000, benefits: { queue_slots: 2, daily_login_bonus_pct: 20, cosmetic_slot: true  } },
  { vip_level: 5,  threshold_cents:    25000, benefits: { queue_slots: 3, daily_login_bonus_pct: 25, cosmetic_slot: true  } },
  { vip_level: 6,  threshold_cents:    50000, benefits: { queue_slots: 3, daily_login_bonus_pct: 30, cosmetic_slot: true  } },
  { vip_level: 7,  threshold_cents:   100000, benefits: { queue_slots: 4, daily_login_bonus_pct: 35, cosmetic_slot: true  } },
  { vip_level: 8,  threshold_cents:   250000, benefits: { queue_slots: 4, daily_login_bonus_pct: 40, cosmetic_slot: true  } },
  { vip_level: 9,  threshold_cents:   500000, benefits: { queue_slots: 5, daily_login_bonus_pct: 45, cosmetic_slot: true  } },
  { vip_level: 10, threshold_cents:  1000000, benefits: { queue_slots: 5, daily_login_bonus_pct: 50, cosmetic_slot: true  } },
];

export class VipSchema1746600000000 implements MigrationInterface {
  name = 'VipSchema1746600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── vip_tier_configs ─────────────────────────────────────────────────────
    // All benefits are non-combat (queue slots, cosmetic, login bonus %).
    // No direct power/stat buffs — P2W kırmızı çizgi.
    await queryRunner.query(`
      CREATE TABLE vip_tier_configs (
        vip_level INT PRIMARY KEY CHECK (vip_level BETWEEN 1 AND 10),
        threshold_cents INT NOT NULL,
        benefits JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const rows = VIP_TIERS.map(
      (t) => `(${t.vip_level}, ${t.threshold_cents}, '${JSON.stringify(t.benefits)}'::jsonb)`,
    ).join(',\n        ');

    await queryRunner.query(`
      INSERT INTO vip_tier_configs (vip_level, threshold_cents, benefits) VALUES
        ${rows}
    `);

    // ─── vip_spend_ledger ─────────────────────────────────────────────────────
    // Cumulative spend per player — source of truth for VIP tier.
    await queryRunner.query(`
      CREATE TABLE vip_spend_ledger (
        player_id UUID PRIMARY KEY,
        cumulative_spend_cents INT NOT NULL DEFAULT 0,
        current_vip_level INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_vip_ledger_level ON vip_spend_ledger (current_vip_level)`);

    await queryRunner.query(`
      CREATE TRIGGER update_vip_spend_ledger_updated_at
        BEFORE UPDATE ON vip_spend_ledger
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // ─── purchase_events ──────────────────────────────────────────────────────
    // Per-user ARPPU telemetry — NOT aggregate.
    // vip_level_at_purchase enables cohort ARPPU segmentation.
    await queryRunner.query(`
      CREATE TABLE purchase_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        purchase_type VARCHAR(64) NOT NULL,
        amount_cents INT NOT NULL,
        vip_level_at_purchase INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_purchase_events_player ON purchase_events (player_id)`);
    await queryRunner.query(`CREATE INDEX idx_purchase_events_created ON purchase_events (created_at DESC)`);
    // Composite for ARPPU cohort queries
    await queryRunner.query(`CREATE INDEX idx_purchase_events_vip_created ON purchase_events (vip_level_at_purchase, created_at DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_events`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_vip_spend_ledger_updated_at ON vip_spend_ledger`);
    await queryRunner.query(`DROP TABLE IF EXISTS vip_spend_ledger`);
    await queryRunner.query(`DROP TABLE IF EXISTS vip_tier_configs`);
  }
}
