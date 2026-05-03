-- Migration 007: VIP Cumulative Spend System + Per-User ARPPU Telemetry
-- CAL-254: VIP tier yükseltme, kümülatif harcama takibi, ARPPU segmentasyonu

-- ==========================================
-- VIP Tier Configuration
-- ==========================================

CREATE TABLE IF NOT EXISTS vip_tier_config (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vip_level           SMALLINT NOT NULL UNIQUE CHECK (vip_level BETWEEN 0 AND 10),
    min_spend_usd       NUMERIC(12,2) NOT NULL CHECK (min_spend_usd >= 0),
    label               VARCHAR(50) NOT NULL,
    benefits            JSONB NOT NULL DEFAULT '{}',
    -- A/B test override: feature flag name for this tier's benefit config
    feature_flag        VARCHAR(100),
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vip_tier_config_level ON vip_tier_config(vip_level);
CREATE INDEX idx_vip_tier_config_spend ON vip_tier_config(min_spend_usd);

-- Seed VIP tier thresholds and benefits
-- No direct combat buffs per design spec; cosmetic + queue + daily login bonuses only
INSERT INTO vip_tier_config (vip_level, min_spend_usd, label, benefits) VALUES
(0,       0.00, 'Standard',   '{
    "daily_nebula_coins": 0,
    "extra_queue_slots": 0,
    "cosmetics": [],
    "perks": []
}'),
(1,       5.00, 'VIP I',      '{
    "daily_nebula_coins": 10,
    "extra_queue_slots": 0,
    "cosmetics": ["vip1_badge"],
    "perks": ["vip_chat_color"]
}'),
(2,      10.00, 'VIP II',     '{
    "daily_nebula_coins": 20,
    "extra_queue_slots": 0,
    "cosmetics": ["vip2_badge"],
    "perks": ["vip_chat_color", "priority_matchmaking"]
}'),
(3,      30.00, 'VIP III',    '{
    "daily_nebula_coins": 30,
    "extra_queue_slots": 1,
    "cosmetics": ["vip3_badge", "vip3_frame"],
    "perks": ["vip_chat_color", "priority_matchmaking"]
}'),
(4,     100.00, 'VIP IV',     '{
    "daily_nebula_coins": 50,
    "extra_queue_slots": 1,
    "cosmetics": ["vip4_badge", "vip4_frame", "vip4_trail"],
    "perks": ["vip_chat_color", "priority_matchmaking", "exclusive_vip_channel"]
}'),
(5,     250.00, 'VIP V',      '{
    "daily_nebula_coins": 75,
    "extra_queue_slots": 2,
    "cosmetics": ["vip5_badge", "vip5_frame", "vip5_trail", "vip5_skin"],
    "perks": ["vip_chat_color", "priority_matchmaking", "exclusive_vip_channel", "priority_support"]
}'),
(6,     500.00, 'VIP VI',     '{
    "daily_nebula_coins": 100,
    "extra_queue_slots": 2,
    "cosmetics": ["vip6_badge", "vip6_frame", "vip6_trail", "vip6_skin"],
    "perks": ["vip_chat_color", "priority_matchmaking", "exclusive_vip_channel", "priority_support", "monthly_cosmetic_gift"]
}'),
(7,    1000.00, 'VIP VII',    '{
    "daily_nebula_coins": 150,
    "extra_queue_slots": 3,
    "cosmetics": ["vip7_badge", "vip7_frame", "vip7_trail", "vip7_skin", "vip7_avatar"],
    "perks": ["vip_chat_color", "priority_matchmaking", "exclusive_vip_channel", "priority_support", "monthly_cosmetic_gift", "vip7_chat_badge"]
}'),
(8,    1500.00, 'VIP VIII',   '{
    "daily_nebula_coins": 200,
    "extra_queue_slots": 3,
    "cosmetics": ["vip8_badge", "vip8_frame", "vip8_trail", "vip8_skin", "vip8_avatar", "vip8_portrait"],
    "perks": ["vip_chat_color", "priority_matchmaking", "exclusive_vip_channel", "priority_support", "monthly_cosmetic_gift", "vip7_chat_badge", "dedicated_support_agent"]
}'),
(9,    3000.00, 'VIP IX',     '{
    "daily_nebula_coins": 300,
    "extra_queue_slots": 4,
    "cosmetics": ["vip9_badge", "vip9_frame", "vip9_trail", "vip9_skin", "vip9_avatar", "vip9_portrait", "vip9_legendary_set"],
    "perks": ["vip_chat_color", "priority_matchmaking", "exclusive_vip_channel", "priority_support", "monthly_cosmetic_gift", "vip7_chat_badge", "dedicated_support_agent", "beta_access"]
}'),
(10,  10000.00, 'VIP X',      '{
    "daily_nebula_coins": 500,
    "extra_queue_slots": 5,
    "cosmetics": ["vip10_badge", "vip10_frame", "vip10_trail", "vip10_skin", "vip10_avatar", "vip10_portrait", "vip10_legendary_set", "vip10_exclusive_skin"],
    "perks": ["vip_chat_color", "priority_matchmaking", "exclusive_vip_channel", "priority_support", "monthly_cosmetic_gift", "vip7_chat_badge", "dedicated_support_agent", "beta_access", "council_member"]
}')
ON CONFLICT (vip_level) DO NOTHING;

-- ==========================================
-- Per-User VIP Spending Tracker
-- ==========================================

CREATE TABLE IF NOT EXISTS user_vip_spending (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE,
    cumulative_spend_usd NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (cumulative_spend_usd >= 0),
    vip_level           SMALLINT NOT NULL DEFAULT 0 CHECK (vip_level BETWEEN 0 AND 10),
    last_upgraded_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_vip_spending_user ON user_vip_spending(user_id);
CREATE INDEX idx_user_vip_spending_level ON user_vip_spending(vip_level);

-- ==========================================
-- Per-User ARPPU Purchase Telemetry
-- ==========================================
-- Tracks individual purchases for per-user cohort ARPPU analysis.
-- Distinct from aggregate revenue_summary view — supports per-user segmentation.

CREATE TABLE IF NOT EXISTS purchase_telemetry (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id               UUID NOT NULL,
    transaction_id          UUID REFERENCES transactions(id),
    purchase_amount_usd     NUMERIC(10,2),
    purchase_amount_try     NUMERIC(10,2),
    currency_code           CHAR(3) NOT NULL DEFAULT 'USD',
    purchase_type           VARCHAR(50) NOT NULL,
    vip_level_at_purchase   SMALLINT NOT NULL DEFAULT 0,
    country_code            CHAR(2),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_telemetry_player ON purchase_telemetry(player_id);
CREATE INDEX idx_purchase_telemetry_vip_level ON purchase_telemetry(vip_level_at_purchase);
CREATE INDEX idx_purchase_telemetry_created ON purchase_telemetry(created_at DESC);
CREATE INDEX idx_purchase_telemetry_type ON purchase_telemetry(purchase_type);

-- Composite index for ARPPU cohort queries: VIP tier + time window
CREATE INDEX idx_purchase_telemetry_cohort ON purchase_telemetry(vip_level_at_purchase, created_at DESC);

-- ==========================================
-- Atomic VIP Upgrade Function
-- ==========================================
-- Called inside completeTransaction; idempotent via ON CONFLICT DO UPDATE.
-- Adds spend_amount to the user's cumulative total and upgrades VIP level
-- to the highest tier whose threshold is not exceeded.

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
    -- Upsert: create row if first purchase, else accumulate spend
    INSERT INTO user_vip_spending (user_id, cumulative_spend_usd, vip_level)
    VALUES (p_user_id, p_spend_usd, 0)
    ON CONFLICT (user_id) DO UPDATE
        SET cumulative_spend_usd = user_vip_spending.cumulative_spend_usd + p_spend_usd,
            updated_at           = NOW()
    RETURNING cumulative_spend_usd, vip_level
    INTO v_total_spend, v_old_level;

    -- Determine new VIP level: highest tier whose threshold <= total spend
    SELECT COALESCE(MAX(vtc.vip_level), 0)
    INTO   v_new_level
    FROM   vip_tier_config vtc
    WHERE  vtc.is_active = true
      AND  vtc.min_spend_usd <= v_total_spend;

    -- Upgrade if level increased
    IF v_new_level > v_old_level THEN
        UPDATE user_vip_spending
        SET    vip_level        = v_new_level,
               last_upgraded_at = NOW(),
               updated_at       = NOW()
        WHERE  user_id = p_user_id;
    END IF;

    RETURN QUERY SELECT v_new_level, v_old_level, v_total_spend, (v_new_level > v_old_level);
END;
$$;

-- ==========================================
-- Dashboard Views
-- ==========================================

-- ARPPU per VIP cohort (for analytics dashboards)
CREATE OR REPLACE VIEW arppu_by_vip_cohort AS
SELECT
    pt.vip_level_at_purchase                    AS vip_level,
    vtc.label                                   AS vip_label,
    COUNT(DISTINCT pt.player_id)                AS unique_payers,
    COUNT(*)                                    AS purchase_count,
    SUM(pt.purchase_amount_usd)                 AS total_revenue_usd,
    AVG(pt.purchase_amount_usd)                 AS avg_purchase_usd,
    SUM(pt.purchase_amount_usd)
        / NULLIF(COUNT(DISTINCT pt.player_id), 0) AS arppu_usd
FROM   purchase_telemetry pt
LEFT JOIN vip_tier_config vtc ON vtc.vip_level = pt.vip_level_at_purchase
WHERE  pt.purchase_amount_usd IS NOT NULL
GROUP BY pt.vip_level_at_purchase, vtc.label
ORDER BY pt.vip_level_at_purchase;

-- Per-user lifetime value with current VIP status
CREATE OR REPLACE VIEW user_vip_ltv AS
SELECT
    uvs.user_id,
    uvs.vip_level,
    vtc.label                       AS vip_label,
    uvs.cumulative_spend_usd        AS ltv_usd,
    uvs.last_upgraded_at,
    COUNT(pt.id)                    AS total_purchases,
    MAX(pt.created_at)              AS last_purchase_at
FROM   user_vip_spending uvs
LEFT JOIN vip_tier_config vtc ON vtc.vip_level = uvs.vip_level
LEFT JOIN purchase_telemetry pt ON pt.player_id = uvs.user_id
GROUP BY uvs.user_id, uvs.vip_level, vtc.label, uvs.cumulative_spend_usd, uvs.last_upgraded_at;
