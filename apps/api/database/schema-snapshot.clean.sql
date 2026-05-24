
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

CREATE TYPE public.alliance_applications_status_enum AS ENUM (
    'pending',
    'accepted',
    'rejected'
);

CREATE TYPE public.alliance_applications_type_enum AS ENUM (
    'request',
    'invite'
);

CREATE TYPE public.alliance_members_role_enum AS ENUM (
    'leader',
    'officer',
    'veteran',
    'member',
    'recruit'
);

CREATE TYPE public.alliance_wars_status_enum AS ENUM (
    'declared',
    'active',
    'truce',
    'ended'
);

CREATE TYPE public.buildings_type_enum AS ENUM (
    'command_center',
    'mine',
    'refinery',
    'barracks',
    'hangar',
    'research_lab',
    'shield_generator',
    'turret'
);

CREATE TYPE public.cosmetic_items_category_enum AS ENUM (
    'skin',
    'frame',
    'title',
    'effect'
);

CREATE TYPE public.cosmetic_items_rarity_enum AS ENUM (
    'common',
    'rare',
    'epic',
    'legendary'
);

CREATE TYPE public.events_status_enum AS ENUM (
    'active',
    'upcoming',
    'archive'
);

CREATE TYPE public.events_type_enum AS ENUM (
    'tournament',
    'resource',
    'guild',
    'special'
);

CREATE TYPE public.games_status_enum AS ENUM (
    'active',
    'paused',
    'completed',
    'abandoned'
);

CREATE TYPE public.resources_type_enum AS ENUM (
    'metal',
    'crystal',
    'gas',
    'energy',
    'dark_matter'
);

CREATE TYPE public.shop_items_category_enum AS ENUM (
    'cosmetic_skin',
    'cosmetic_banner',
    'cosmetic_avatar_frame',
    'cosmetic_trail',
    'cosmetic_chat_bubble',
    'resource_pack',
    'unit_boost',
    'premium_pass',
    'battle_pass_tier_skip',
    'xp_booster',
    'currency_bundle'
);

CREATE TYPE public.units_status_enum AS ENUM (
    'idle',
    'moving',
    'attacking',
    'defending',
    'training'
);

CREATE TYPE public.units_type_enum AS ENUM (
    'fighter',
    'bomber',
    'cruiser',
    'destroyer',
    'battleship',
    'transport',
    'scout',
    'carrier'
);

CREATE TABLE public.ages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    number integer NOT NULL,
    name character varying(100) NOT NULL,
    theme character varying(100) NOT NULL,
    level_min integer NOT NULL,
    level_max integer NOT NULL,
    description text,
    is_active boolean DEFAULT false NOT NULL,
    unlocked_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.alliance_applications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    alliance_id uuid NOT NULL,
    user_id character varying NOT NULL,
    type public.alliance_applications_type_enum DEFAULT 'request'::public.alliance_applications_type_enum NOT NULL,
    status public.alliance_applications_status_enum DEFAULT 'pending'::public.alliance_applications_status_enum NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.alliance_donations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    alliance_id uuid NOT NULL,
    user_id character varying NOT NULL,
    mineral bigint DEFAULT '0'::bigint NOT NULL,
    gas bigint DEFAULT '0'::bigint NOT NULL,
    energy bigint DEFAULT '0'::bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.alliance_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    alliance_id uuid NOT NULL,
    user_id character varying NOT NULL,
    role public.alliance_members_role_enum DEFAULT 'recruit'::public.alliance_members_role_enum NOT NULL,
    contribution integer DEFAULT 0 NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.alliance_storage (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    alliance_id uuid NOT NULL,
    minerals bigint DEFAULT '0'::bigint NOT NULL,
    gas bigint DEFAULT '0'::bigint NOT NULL,
    energy bigint DEFAULT '0'::bigint NOT NULL,
    premium_gems integer DEFAULT 0 NOT NULL,
    capacity bigint DEFAULT '500000'::bigint NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.alliance_wars (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    attacker_id uuid NOT NULL,
    defender_id uuid NOT NULL,
    status public.alliance_wars_status_enum DEFAULT 'declared'::public.alliance_wars_status_enum NOT NULL,
    attacker_score integer DEFAULT 0 NOT NULL,
    defender_score integer DEFAULT 0 NOT NULL,
    winner_id character varying,
    declared_at timestamp with time zone DEFAULT now() NOT NULL,
    starts_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    ends_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.alliances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    tag character varying(10) NOT NULL,
    description text,
    leader_id character varying NOT NULL,
    emblem character varying(50),
    level smallint DEFAULT '1'::smallint NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    max_members integer DEFAULT 20 NOT NULL,
    is_open boolean DEFAULT true NOT NULL,
    min_elo integer DEFAULT 0 NOT NULL,
    war_wins integer DEFAULT 0 NOT NULL,
    war_losses integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.boss_encounter_attempts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    boss_encounter_id uuid NOT NULL,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    current_phase integer DEFAULT 1 NOT NULL,
    boss_hp_remaining bigint,
    units_deployed jsonb DEFAULT '[]'::jsonb NOT NULL,
    units_lost jsonb DEFAULT '[]'::jsonb NOT NULL,
    damage_dealt bigint DEFAULT '0'::bigint NOT NULL,
    damage_taken bigint DEFAULT '0'::bigint NOT NULL,
    mechanics_triggered jsonb DEFAULT '[]'::jsonb NOT NULL,
    rewards_earned jsonb,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    duration_secs integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.boss_encounters (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    phase integer DEFAULT 1 NOT NULL,
    age_id uuid NOT NULL,
    level_required integer NOT NULL,
    hp bigint NOT NULL,
    attack integer NOT NULL,
    defense integer NOT NULL,
    speed integer NOT NULL,
    mechanics jsonb DEFAULT '[]'::jsonb NOT NULL,
    phases jsonb DEFAULT '[]'::jsonb NOT NULL,
    weaknesses jsonb DEFAULT '[]'::jsonb NOT NULL,
    resistances jsonb DEFAULT '[]'::jsonb NOT NULL,
    rewards jsonb DEFAULT '{}'::jsonb NOT NULL,
    lore text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.buildings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "gameId" uuid NOT NULL,
    type public.buildings_type_enum NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    health integer DEFAULT 100 NOT NULL,
    "maxHealth" integer DEFAULT 100 NOT NULL,
    "position" jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.chat_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sender_id character varying NOT NULL,
    channel_type character varying(20) NOT NULL,
    channel_id character varying(100),
    content text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.chat_reactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    message_id uuid NOT NULL,
    user_id character varying NOT NULL,
    emoji character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.cosmetic_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(200) NOT NULL,
    category public.cosmetic_items_category_enum NOT NULL,
    rarity public.cosmetic_items_rarity_enum DEFAULT 'common'::public.cosmetic_items_rarity_enum NOT NULL,
    price_gems integer,
    icon character varying(50) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    preview_image character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_participants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    user_id character varying NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_rewards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    rank integer NOT NULL,
    prize character varying(200) NOT NULL,
    prize_detail character varying(300),
    badge_type character varying(50)
);

CREATE TABLE public.event_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    icon character varying(10) DEFAULT '📋'::character varying NOT NULL,
    title character varying(100) NOT NULL,
    description text NOT NULL,
    sort_order smallint DEFAULT '0'::smallint NOT NULL
);

CREATE TABLE public.events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(200) NOT NULL,
    subtitle character varying(300),
    type public.events_type_enum NOT NULL,
    status public.events_status_enum DEFAULT 'upcoming'::public.events_status_enum NOT NULL,
    race_color character varying(20) DEFAULT '#ffffff'::character varying NOT NULL,
    race_gradient text DEFAULT 'linear-gradient(135deg, #0a0a12 0%, #07090f 100%)'::text NOT NULL,
    race_label character varying(50) DEFAULT ''::character varying NOT NULL,
    description text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    max_participants integer,
    top_prize character varying(200) DEFAULT ''::character varying NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.games (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    status public.games_status_enum DEFAULT 'active'::public.games_status_enum NOT NULL,
    "ownerId" uuid NOT NULL,
    metadata jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.levels (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    age_id uuid NOT NULL,
    number integer NOT NULL,
    name character varying(100) NOT NULL,
    xp_required integer NOT NULL,
    rewards jsonb DEFAULT '{}'::jsonb NOT NULL,
    unlocks jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payment_webhook_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    provider character varying(20) NOT NULL,
    event_id character varying(300) NOT NULL,
    event_type character varying(100) NOT NULL,
    payload jsonb NOT NULL,
    signature character varying(500),
    is_verified boolean DEFAULT false NOT NULL,
    is_processed boolean DEFAULT false NOT NULL,
    processing_error text,
    processed_at timestamp with time zone,
    transaction_id character varying,
    received_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.premium_passes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    pass_type character varying(30) NOT NULL,
    duration_days integer NOT NULL,
    price_usd numeric(10,2) NOT NULL,
    price_try numeric(10,2) NOT NULL,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    rewards jsonb DEFAULT '{}'::jsonb NOT NULL,
    tier_rewards jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.purchase_telemetry (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    player_id character varying NOT NULL,
    transaction_id character varying,
    purchase_amount_usd numeric(10,2),
    purchase_amount_try numeric(10,2),
    currency_code character(3) DEFAULT 'USD'::bpchar NOT NULL,
    purchase_type character varying(50) NOT NULL,
    vip_level_at_purchase smallint DEFAULT '0'::smallint NOT NULL,
    country_code character(2),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.resources (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "gameId" uuid NOT NULL,
    type public.resources_type_enum NOT NULL,
    amount numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    "productionRate" numeric(10,4) DEFAULT '0'::numeric NOT NULL,
    capacity numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.shop_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sku character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    category public.shop_items_category_enum NOT NULL,
    rarity character varying(20) DEFAULT 'common'::character varying NOT NULL,
    price_nebula_coins integer,
    price_void_crystals integer,
    price_premium_gems integer,
    price_real_usd numeric(10,2),
    price_real_try numeric(10,2),
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    preview_asset character varying(500),
    is_limited boolean DEFAULT false NOT NULL,
    limited_stock integer,
    stock_remaining integer,
    available_from timestamp with time zone,
    available_until timestamp with time zone,
    age_required integer,
    level_required integer,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.story_progress (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying(255) NOT NULL,
    completed_chapters text[] DEFAULT '{}'::text[] NOT NULL,
    current_chapter character varying(100) DEFAULT 'ch_01_arrival'::character varying NOT NULL,
    last_choice jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.subspace_battles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    zone_id uuid NOT NULL,
    battle_type character varying(30) NOT NULL,
    attacker_id character varying NOT NULL,
    defender_id character varying,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    attacker_units jsonb DEFAULT '[]'::jsonb NOT NULL,
    defender_units jsonb DEFAULT '[]'::jsonb NOT NULL,
    result jsonb,
    winner_id character varying,
    subspace_effects jsonb DEFAULT '[]'::jsonb NOT NULL,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.subspace_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    zone_id uuid NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    entered_at timestamp with time zone DEFAULT now() NOT NULL,
    exited_at timestamp with time zone,
    duration_secs integer,
    units_deployed jsonb DEFAULT '[]'::jsonb NOT NULL,
    hazards_hit jsonb DEFAULT '[]'::jsonb NOT NULL,
    rewards_earned jsonb DEFAULT '{}'::jsonb NOT NULL,
    enemies_killed integer DEFAULT 0 NOT NULL,
    boss_defeated boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.subspace_zones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    tier character varying(20) NOT NULL,
    level_required integer NOT NULL,
    capacity integer DEFAULT 100 NOT NULL,
    description text,
    modifiers jsonb DEFAULT '{}'::jsonb NOT NULL,
    hazards jsonb DEFAULT '[]'::jsonb NOT NULL,
    rewards jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tier_progression (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    current_level integer DEFAULT 1 NOT NULL,
    current_age integer DEFAULT 1 NOT NULL,
    current_tier_name character varying(64) DEFAULT 'Tohum'::character varying NOT NULL,
    xp bigint DEFAULT '0'::bigint NOT NULL,
    xp_to_next_level bigint DEFAULT '100'::bigint NOT NULL,
    achievements jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    transaction_type character varying NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    provider character varying,
    shop_item_id character varying,
    premium_pass_id character varying,
    amount_usd numeric(10,2),
    amount_try numeric(10,2),
    currency_code character(3) DEFAULT 'USD'::bpchar NOT NULL,
    nebula_coins_delta integer DEFAULT 0 NOT NULL,
    void_crystals_delta integer DEFAULT 0 NOT NULL,
    premium_gems_delta integer DEFAULT 0 NOT NULL,
    provider_payment_id character varying(300),
    provider_order_id character varying(300),
    provider_response jsonb,
    ip_address inet,
    user_agent text,
    country_code character(2),
    notes text,
    refunded_at timestamp with time zone,
    refund_reason text,
    parent_transaction_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tutorial_progress (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying(255) NOT NULL,
    completed_steps text[] DEFAULT '{}'::text[] NOT NULL,
    current_step character varying(100) DEFAULT 'welcome'::character varying NOT NULL,
    selected_race character varying(50),
    is_completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    skipped boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.units (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "gameId" uuid NOT NULL,
    type public.units_type_enum NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    status public.units_status_enum DEFAULT 'idle'::public.units_status_enum NOT NULL,
    "position" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    age_id uuid NOT NULL,
    level_unlock integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    race character varying(30) NOT NULL,
    unit_type character varying(30) NOT NULL,
    tier integer NOT NULL,
    attack integer NOT NULL,
    defense integer NOT NULL,
    speed integer NOT NULL,
    hp integer NOT NULL,
    energy_cost integer NOT NULL,
    mineral_cost integer NOT NULL,
    special_ability jsonb DEFAULT '{}'::jsonb NOT NULL,
    subspace_bonus jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_consent_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    consent_type character varying(50) NOT NULL,
    granted boolean NOT NULL,
    version character varying(20) NOT NULL,
    ip_address inet NOT NULL,
    user_agent text,
    granted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_cosmetics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    cosmetic_id uuid NOT NULL,
    is_equipped boolean DEFAULT false NOT NULL,
    acquired_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_currency (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    nebula_coins integer DEFAULT 0 NOT NULL,
    void_crystals integer DEFAULT 0 NOT NULL,
    premium_gems integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_inventory (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    shop_item_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    acquired_at timestamp with time zone DEFAULT now() NOT NULL,
    source character varying(30) DEFAULT 'purchase'::character varying NOT NULL,
    is_equipped boolean DEFAULT false NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_premium_passes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    premium_pass_id uuid NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    auto_renew boolean DEFAULT false NOT NULL,
    current_tier integer DEFAULT 0 NOT NULL,
    tier_xp integer DEFAULT 0 NOT NULL,
    claimed_rewards jsonb DEFAULT '[]'::jsonb NOT NULL,
    payment_provider character varying(20),
    subscription_id character varying(200),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_vip_spending (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    cumulative_spend_usd numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    vip_level smallint DEFAULT '0'::smallint NOT NULL,
    last_upgraded_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    elo_rating integer DEFAULT 1000 NOT NULL,
    total_games integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    draws integer DEFAULT 0 NOT NULL,
    race character varying(20),
    current_age smallint DEFAULT '1'::smallint NOT NULL,
    current_level smallint DEFAULT '1'::smallint NOT NULL,
    premium_until timestamp with time zone,
    is_banned boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.vip_tier_config (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vip_level smallint NOT NULL,
    min_spend_usd numeric(12,2) NOT NULL,
    label character varying(50) NOT NULL,
    benefits jsonb DEFAULT '{}'::jsonb NOT NULL,
    feature_flag character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT "PK_05f8dd8f715793c64d49e3f1901" PRIMARY KEY (id);

ALTER TABLE ONLY public.cosmetic_items
    ADD CONSTRAINT "PK_063170743125440cbb7d9b114a9" PRIMARY KEY (id);

ALTER TABLE ONLY public.purchase_telemetry
    ADD CONSTRAINT "PK_0ca078f55f5db05c97ef2f64e44" PRIMARY KEY (id);

ALTER TABLE ONLY public.user_inventory
    ADD CONSTRAINT "PK_193d6e1b301eda020c2492d3d9c" PRIMARY KEY (id);

ALTER TABLE ONLY public.subspace_sessions
    ADD CONSTRAINT "PK_19710a38bfa43d9c436562a91eb" PRIMARY KEY (id);

ALTER TABLE ONLY public.event_rules
    ADD CONSTRAINT "PK_1bb477fda5fb5ab5db163ed84b3" PRIMARY KEY (id);

ALTER TABLE ONLY public.event_rewards
    ADD CONSTRAINT "PK_2831d69cdf1eafc8f931b76d648" PRIMARY KEY (id);

ALTER TABLE ONLY public.alliance_members
    ADD CONSTRAINT "PK_2d048ccbec1c1ff35fecf9f80cb" PRIMARY KEY (id);

ALTER TABLE ONLY public.alliances
    ADD CONSTRAINT "PK_399af2ac4eb985fd426454df023" PRIMARY KEY (id);

ALTER TABLE ONLY public.user_consent_records
    ADD CONSTRAINT "PK_3e14f45b818f5f84babc4c206d3" PRIMARY KEY (id);

ALTER TABLE ONLY public.events
    ADD CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY (id);

ALTER TABLE ONLY public.shop_items
    ADD CONSTRAINT "PK_413571c2dd7b80fd08551cf7726" PRIMARY KEY (id);

ALTER TABLE ONLY public.alliance_wars
    ADD CONSTRAINT "PK_45f48e4d0ea4f940b65a09f2ab3" PRIMARY KEY (id);

ALTER TABLE ONLY public.user_currency
    ADD CONSTRAINT "PK_46950bb3bc8e5d3c7ecc7dae605" PRIMARY KEY (id);

ALTER TABLE ONLY public.alliance_donations
    ADD CONSTRAINT "PK_4d2127be85d084f0bfc1dab5f27" PRIMARY KEY (id);

ALTER TABLE ONLY public.premium_passes
    ADD CONSTRAINT "PK_5160922f70f10a80a4aa3e32697" PRIMARY KEY (id);

ALTER TABLE ONLY public.alliance_storage
    ADD CONSTRAINT "PK_599de5755a37944faea2ef08e91" PRIMARY KEY (id);

ALTER TABLE ONLY public.units
    ADD CONSTRAINT "PK_5a8f2f064919b587d93936cb223" PRIMARY KEY (id);

ALTER TABLE ONLY public.user_vip_spending
    ADD CONSTRAINT "PK_62f11b39db3df08206adb81b47f" PRIMARY KEY (id);

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT "PK_632484ab9dff41bba94f9b7c85e" PRIMARY KEY (id);

ALTER TABLE ONLY public.user_cosmetics
    ADD CONSTRAINT "PK_69f95df2183a52e7c06d24d9fb4" PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_webhook_events
    ADD CONSTRAINT "PK_750875e71d97974be92cee813ba" PRIMARY KEY (id);

ALTER TABLE ONLY public.vip_tier_config
    ADD CONSTRAINT "PK_75d88a057cc99fc728fb85229bc" PRIMARY KEY (id);

ALTER TABLE ONLY public.alliance_applications
    ADD CONSTRAINT "PK_7fcbc6308970f92aecddd36488c" PRIMARY KEY (id);

ALTER TABLE ONLY public.tier_progression
    ADD CONSTRAINT "PK_87dfa18b526554403ad3d291253" PRIMARY KEY (id);

ALTER TABLE ONLY public.story_progress
    ADD CONSTRAINT "PK_8c7bd5198f71cd45ca1070363ab" PRIMARY KEY (id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);

ALTER TABLE ONLY public.tutorial_progress
    ADD CONSTRAINT "PK_a4429a01369828467de31c63dc7" PRIMARY KEY (id);

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT "PK_b65ffd558d76fd51baffe81d42b" PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT "PK_b7996d25cac88b0b98dd010f34a" PRIMARY KEY (id);

ALTER TABLE ONLY public.subspace_battles
    ADD CONSTRAINT "PK_b876d7c0fc2c3d2737ca7acd8f3" PRIMARY KEY (id);

ALTER TABLE ONLY public.ages
    ADD CONSTRAINT "PK_bab808120bd8958af38b977a118" PRIMARY KEY (id);

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT "PK_bc65c1acce268c383e41a69003a" PRIMARY KEY (id);

ALTER TABLE ONLY public.games
    ADD CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY (id);

ALTER TABLE ONLY public.boss_encounter_attempts
    ADD CONSTRAINT "PK_d74f5f7c7203e8f02c6e544330b" PRIMARY KEY (id);

ALTER TABLE ONLY public.subspace_zones
    ADD CONSTRAINT "PK_f8476ec182e4d60a76f779b7179" PRIMARY KEY (id);

ALTER TABLE ONLY public.user_premium_passes
    ADD CONSTRAINT "PK_fca3427bcd1563c5eaf04103490" PRIMARY KEY (id);

ALTER TABLE ONLY public.boss_encounters
    ADD CONSTRAINT "PK_fef2f11c417829ad20a34c52f18" PRIMARY KEY (id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "UQ_1a79c0b1d6be9f5c178d93a6cef" UNIQUE (provider_payment_id);

ALTER TABLE ONLY public.vip_tier_config
    ADD CONSTRAINT "UQ_1caa5b5ac61cb730d20278181dc" UNIQUE (vip_level);

ALTER TABLE ONLY public.subspace_zones
    ADD CONSTRAINT "UQ_2598978761d62270ebf6b2994cd" UNIQUE (code);

ALTER TABLE ONLY public.user_cosmetics
    ADD CONSTRAINT "UQ_3ff6cb07de1363fc459cf8def31" UNIQUE (user_id, cosmetic_id);

ALTER TABLE ONLY public.boss_encounters
    ADD CONSTRAINT "UQ_449a027d2f08624be0faa331bc5" UNIQUE (code);

ALTER TABLE ONLY public.units
    ADD CONSTRAINT "UQ_47635c1ab22d02fc3ebae3608b8" UNIQUE (code);

ALTER TABLE ONLY public.user_currency
    ADD CONSTRAINT "UQ_49a41ebdedb2e63a76f42e7ded3" UNIQUE (user_id);

ALTER TABLE ONLY public.payment_webhook_events
    ADD CONSTRAINT "UQ_6d9f05715869e726f06f8a1cac8" UNIQUE (provider, event_id);

ALTER TABLE ONLY public.alliances
    ADD CONSTRAINT "UQ_6de0494750b3d494660c9e1a8c6" UNIQUE (name);

ALTER TABLE ONLY public.user_inventory
    ADD CONSTRAINT "UQ_7a76a03ddf19c75262d58b99227" UNIQUE (user_id, shop_item_id);

ALTER TABLE ONLY public.alliance_storage
    ADD CONSTRAINT "UQ_961b04e28e6b9c6f691f587520f" UNIQUE (alliance_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);

ALTER TABLE ONLY public.shop_items
    ADD CONSTRAINT "UQ_a13752a401a6f5ffde9bd06cb5a" UNIQUE (sku);

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT "UQ_a1e4ca081ca649332d4b1499f7d" UNIQUE (number);

ALTER TABLE ONLY public.ages
    ADD CONSTRAINT "UQ_b66c4f4bcd54b090c7dceb3f032" UNIQUE (number);

ALTER TABLE ONLY public.premium_passes
    ADD CONSTRAINT "UQ_ba8d3db7a5b4cdffd6618cef2d2" UNIQUE (code);

ALTER TABLE ONLY public.user_vip_spending
    ADD CONSTRAINT "UQ_c11ed5ec9f304bcf304d7c42c7f" UNIQUE (user_id);

ALTER TABLE ONLY public.alliances
    ADD CONSTRAINT "UQ_db23a43f3d2d2cee9fc0c32762c" UNIQUE (tag);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username);

CREATE UNIQUE INDEX "IDX_305c0497995cb2ce6bc84f8f24" ON public.tutorial_progress USING btree (user_id);

CREATE UNIQUE INDEX "IDX_df4e890e9c1a32b8fb6c6e8cbb" ON public.tier_progression USING btree (user_id);

CREATE UNIQUE INDEX "IDX_fd2f5b8396e46eb8e108fcd0b4" ON public.story_progress USING btree (user_id);

ALTER TABLE ONLY public.user_premium_passes
    ADD CONSTRAINT "FK_01c279489f3084e8bf8c20539f2" FOREIGN KEY (premium_pass_id) REFERENCES public.premium_passes(id);

ALTER TABLE ONLY public.units
    ADD CONSTRAINT "FK_1a33df4ccfd52f831f3bc2d144b" FOREIGN KEY (age_id) REFERENCES public.ages(id);

ALTER TABLE ONLY public.user_cosmetics
    ADD CONSTRAINT "FK_2372e7d5915e9e350fa7e5058a7" FOREIGN KEY (cosmetic_id) REFERENCES public.cosmetic_items(id);

ALTER TABLE ONLY public.subspace_sessions
    ADD CONSTRAINT "FK_363015832f323e3f3cda6c24e06" FOREIGN KEY (zone_id) REFERENCES public.subspace_zones(id);

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT "FK_386e8b7269a45000fdd483285f6" FOREIGN KEY (age_id) REFERENCES public.ages(id);

ALTER TABLE ONLY public.boss_encounter_attempts
    ADD CONSTRAINT "FK_40a5df0d0afb0ca57260161cb40" FOREIGN KEY (boss_encounter_id) REFERENCES public.boss_encounters(id);

ALTER TABLE ONLY public.subspace_battles
    ADD CONSTRAINT "FK_457eb098b182b923723f88dd19f" FOREIGN KEY (zone_id) REFERENCES public.subspace_zones(id);

ALTER TABLE ONLY public.event_rules
    ADD CONSTRAINT "FK_49bd79c3d1906753715ebf82dca" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.boss_encounters
    ADD CONSTRAINT "FK_4f6b939cf0bc5601bb9d41dae00" FOREIGN KEY (age_id) REFERENCES public.ages(id);

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT "FK_649e6095ab654ddfa5566d6683a" FOREIGN KEY ("gameId") REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.units
    ADD CONSTRAINT "FK_6cc91ebe014bf55a31abc7876ce" FOREIGN KEY ("gameId") REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT "FK_6dbee1f9145109f84b8b20b6977" FOREIGN KEY ("gameId") REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.games
    ADD CONSTRAINT "FK_7ba31d25ad376fbcb7f8a20a8db" FOREIGN KEY ("ownerId") REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.alliance_members
    ADD CONSTRAINT "FK_8621b753601984e6fb3ced8846c" FOREIGN KEY (alliance_id) REFERENCES public.alliances(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.alliance_storage
    ADD CONSTRAINT "FK_961b04e28e6b9c6f691f587520f" FOREIGN KEY (alliance_id) REFERENCES public.alliances(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_rewards
    ADD CONSTRAINT "FK_abf99e0ff40a701337bf545d948" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.alliance_wars
    ADD CONSTRAINT "FK_ada2a5530166a4ed0b5c4009f9e" FOREIGN KEY (defender_id) REFERENCES public.alliances(id);

ALTER TABLE ONLY public.alliance_wars
    ADD CONSTRAINT "FK_ae54ff62dd4e91468017cfa86cf" FOREIGN KEY (attacker_id) REFERENCES public.alliances(id);

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT "FK_b3409942f1ea185576f1adce065" FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT "FK_b5349807aae71193d0cc0f52e35" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_inventory
    ADD CONSTRAINT "FK_be5d17f6e0df4125c4d24727d0e" FOREIGN KEY (shop_item_id) REFERENCES public.shop_items(id);

ALTER TABLE ONLY public.alliance_applications
    ADD CONSTRAINT "FK_dc23315e10f6cc8dfa44b18e0d1" FOREIGN KEY (alliance_id) REFERENCES public.alliances(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.alliance_donations
    ADD CONSTRAINT "FK_ffbb66f17e5651f3269638d402e" FOREIGN KEY (alliance_id) REFERENCES public.alliances(id) ON DELETE CASCADE;
