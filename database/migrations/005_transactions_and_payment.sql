-- Migration 005: Transactions, Payment Webhooks, KVKK/GDPR
-- Ödeme entegrasyonu: Stripe + iyzico
-- KVKK/GDPR uyumlu veri akışı

-- Transaction types
CREATE TYPE transaction_type AS ENUM (
    'purchase_item',
    'purchase_currency_bundle',
    'purchase_premium_pass',
    'purchase_battle_pass',
    'refund',
    'chargeback',
    'gift',
    'reward',
    'currency_conversion'
);

CREATE TYPE transaction_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'disputed',
    'cancelled'
);

CREATE TYPE payment_provider AS ENUM (
    'stripe',
    'iyzico',
    'internal'
);

-- Main transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL,
    transaction_type    transaction_type NOT NULL,
    status              transaction_status NOT NULL DEFAULT 'pending',
    provider            payment_provider,

    -- Item/pass references
    shop_item_id        UUID REFERENCES shop_items(id),
    premium_pass_id     UUID REFERENCES premium_passes(id),

    -- Amounts
    amount_usd          NUMERIC(10,2),
    amount_try          NUMERIC(10,2),
    currency_code       CHAR(3) DEFAULT 'USD',

    -- In-game currency amounts
    nebula_coins_delta  INTEGER NOT NULL DEFAULT 0,
    void_crystals_delta INTEGER NOT NULL DEFAULT 0,
    premium_gems_delta  INTEGER NOT NULL DEFAULT 0,

    -- Provider references
    provider_payment_id VARCHAR(300) UNIQUE,
    provider_order_id   VARCHAR(300),
    provider_response   JSONB,

    -- Metadata
    ip_address          INET,
    user_agent          TEXT,
    country_code        CHAR(2),
    notes               TEXT,

    -- Refund tracking
    refunded_at         TIMESTAMPTZ,
    refund_reason       TEXT,
    parent_transaction_id UUID REFERENCES transactions(id),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_provider ON transactions(provider);
CREATE INDEX idx_transactions_provider_payment ON transactions(provider_payment_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- Payment webhook event log
CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider        payment_provider NOT NULL,
    event_id        VARCHAR(300) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,
    signature       VARCHAR(500),
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    is_processed    BOOLEAN NOT NULL DEFAULT false,
    processing_error TEXT,
    processed_at    TIMESTAMPTZ,
    transaction_id  UUID REFERENCES transactions(id),
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, event_id)
);

CREATE INDEX idx_webhook_events_provider ON payment_webhook_events(provider);
CREATE INDEX idx_webhook_events_processed ON payment_webhook_events(is_processed);
CREATE INDEX idx_webhook_events_type ON payment_webhook_events(event_type);

-- iyzico specific: basket/order items (iyzico requires detailed basket for fraud prevention)
CREATE TABLE IF NOT EXISTS iyzico_payment_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id      UUID NOT NULL REFERENCES transactions(id),
    conversation_id     VARCHAR(100) NOT NULL UNIQUE,
    token               VARCHAR(200),
    payment_page_url    VARCHAR(500),
    checkout_form_content TEXT,
    basket_items        JSONB NOT NULL DEFAULT '[]',
    buyer_info          JSONB NOT NULL DEFAULT '{}',
    billing_address     JSONB NOT NULL DEFAULT '{}',
    status              VARCHAR(30) NOT NULL DEFAULT 'pending',
    error_code          VARCHAR(50),
    error_message       TEXT,
    fraud_status        INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_iyzico_requests_conversation ON iyzico_payment_requests(conversation_id);
CREATE INDEX idx_iyzico_requests_transaction ON iyzico_payment_requests(transaction_id);

-- ==========================================
-- KVKK / GDPR Compliance Tables
-- ==========================================

-- User consent records (KVKK açık rıza kaydı)
CREATE TABLE IF NOT EXISTS user_consent_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL,
    consent_type    VARCHAR(50) NOT NULL
                    CHECK (consent_type IN (
                        'terms_of_service',
                        'privacy_policy',
                        'payment_data_processing',
                        'marketing_emails',
                        'analytics_tracking',
                        'third_party_sharing',
                        'age_verification'
                    )),
    granted         BOOLEAN NOT NULL,
    version         VARCHAR(20) NOT NULL,
    ip_address      INET NOT NULL,
    user_agent      TEXT,
    granted_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_user ON user_consent_records(user_id);
CREATE INDEX idx_consent_type ON user_consent_records(consent_type);

-- Data subject requests (Hak kullanım talepleri - silme, taşıma, erişim)
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL,
    request_type    VARCHAR(30) NOT NULL
                    CHECK (request_type IN (
                        'access',           -- Kişisel verilere erişim
                        'rectification',    -- Veri düzeltme
                        'erasure',          -- Veri silme (unutulma hakkı)
                        'portability',      -- Veri taşıma
                        'restriction',      -- İşleme kısıtlama
                        'objection'         -- İtiraz
                    )),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    details         TEXT,
    response        TEXT,
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline_at     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
    completed_at    TIMESTAMPTZ,
    processed_by    UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dsr_user ON data_subject_requests(user_id);
CREATE INDEX idx_dsr_status ON data_subject_requests(status);
CREATE INDEX idx_dsr_deadline ON data_subject_requests(deadline_at);

-- Payment data anonymization log (ödeme verisi anonimleştirme kaydı)
CREATE TABLE IF NOT EXISTS payment_data_anonymization_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL,
    anonymized_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    records_count   INTEGER NOT NULL DEFAULT 0,
    reason          VARCHAR(50) NOT NULL
                    CHECK (reason IN ('user_erasure_request', 'retention_period_expired', 'consent_withdrawn')),
    performed_by    VARCHAR(50) NOT NULL DEFAULT 'system'
);

CREATE INDEX idx_anonymization_user ON payment_data_anonymization_log(user_id);

-- ==========================================
-- Helper views
-- ==========================================

-- Active premium users view
CREATE OR REPLACE VIEW active_premium_users AS
SELECT
    upp.user_id,
    pp.code AS pass_code,
    pp.name AS pass_name,
    pp.pass_type,
    upp.started_at,
    upp.expires_at,
    upp.current_tier,
    pp.features
FROM user_premium_passes upp
JOIN premium_passes pp ON pp.id = upp.premium_pass_id
WHERE upp.status = 'active'
  AND upp.expires_at > NOW();

-- Revenue summary view (USD sadece, PII yok)
CREATE OR REPLACE VIEW revenue_summary AS
SELECT
    DATE_TRUNC('day', created_at) AS day,
    provider,
    transaction_type,
    COUNT(*) AS transaction_count,
    SUM(amount_usd) AS total_usd,
    SUM(amount_try) AS total_try
FROM transactions
WHERE status = 'completed'
  AND provider IN ('stripe', 'iyzico')
GROUP BY 1, 2, 3;
