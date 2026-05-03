import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema covering every @Entity() in the game-server module tree.
 *
 * Idempotent: every CREATE uses IF NOT EXISTS so the migration is safe to run
 * against an environment where some tables (e.g. those produced by the legacy
 * SQL files in `apps/game-server/migrations` and
 * `apps/game-server/src/database/migrations`) already exist.
 *
 * After this migration runs, TypeORM owns the schema: future schema changes
 * should be added as new TypeORM migrations rather than raw SQL files.
 */
export class InitialSchema1714723200000 implements MigrationInterface {
  name = 'InitialSchema1714723200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ─── shared trigger function for updated_at ─────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ─── enums ──────────────────────────────────────────────────────────────
    await this.createEnum(queryRunner, 'buildings_type_enum', [
      'command_center',
      'mineral_extractor',
      'gas_refinery',
      'solar_plant',
      'barracks',
      'turret',
      'shield_generator',
      'nano_forge',
      'cyber_core',
      'quantum_reactor',
      'defense_matrix',
      'repair_drone_bay',
    ]);
    await this.createEnum(queryRunner, 'buildings_status_enum', [
      'constructing',
      'active',
      'destroyed',
    ]);
    await this.createEnum(queryRunner, 'chat_messages_channel_type_enum', [
      'global',
      'alliance',
      'private',
      'system',
    ]);
    await this.createEnum(queryRunner, 'guild_events_type_enum', [
      'join',
      'leave',
      'donate',
      'raid_attend',
      'chat_message',
      'research_contrib',
    ]);
    await this.createEnum(queryRunner, 'guild_members_role_enum', [
      'leader',
      'officer',
      'member',
    ]);
    await this.createEnum(queryRunner, 'guild_tutorial_states_state_enum', [
      'not_started',
      'guild_chosen',
      'first_donation',
      'first_quest',
      'completed',
    ]);
    const unitTypes = [
      'marine',
      'medic',
      'siege_tank',
      'ghost',
      'zergling',
      'hydralisk',
      'ultralisk',
      'queen',
    ];
    const races = ['human', 'zerg', 'automaton'];
    await this.createEnum(queryRunner, 'player_units_type_enum', unitTypes);
    await this.createEnum(queryRunner, 'player_units_race_enum', races);
    await this.createEnum(queryRunner, 'training_queue_unit_type_enum', unitTypes);
    await this.createEnum(queryRunner, 'training_queue_race_enum', races);

    // ─── players ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS players (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        username      VARCHAR(64)  NOT NULL UNIQUE,
        elo           INTEGER      NOT NULL DEFAULT 1000,
        games_played  INTEGER      NOT NULL DEFAULT 0,
        is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await this.createUpdatedAtTrigger(queryRunner, 'players');

    // ─── buildings ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id                        UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id                 UUID                     NOT NULL,
        type                      buildings_type_enum      NOT NULL,
        level                     INTEGER                  NOT NULL DEFAULT 1,
        status                    buildings_status_enum    NOT NULL DEFAULT 'constructing',
        construction_started_at   TIMESTAMPTZ,
        construction_complete_at  TIMESTAMPTZ,
        position_x                INTEGER                  NOT NULL DEFAULT 0,
        position_y                INTEGER                  NOT NULL DEFAULT 0,
        created_at                TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMPTZ              NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_buildings_player_id ON buildings (player_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_buildings_player_status ON buildings (player_id, status)`);
    await this.createUpdatedAtTrigger(queryRunner, 'buildings');

    // ─── resources ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id             UUID            NOT NULL UNIQUE,
        mineral               NUMERIC(12,4)   NOT NULL DEFAULT 100,
        gas                   NUMERIC(12,4)   NOT NULL DEFAULT 50,
        energy                NUMERIC(12,4)   NOT NULL DEFAULT 100,
        population            NUMERIC(12,4)   NOT NULL DEFAULT 0,
        mineral_cap           INTEGER         NOT NULL DEFAULT 24000,
        gas_cap               INTEGER         NOT NULL DEFAULT 14400,
        energy_cap            INTEGER         NOT NULL DEFAULT 8400,
        population_cap        INTEGER         NOT NULL DEFAULT 5000,
        mineral_per_tick      NUMERIC(10,4)   NOT NULL DEFAULT 0,
        gas_per_tick          NUMERIC(10,4)   NOT NULL DEFAULT 0,
        energy_per_tick       NUMERIC(10,4)   NOT NULL DEFAULT 0,
        population_per_tick   NUMERIC(10,4)   NOT NULL DEFAULT 0,
        last_tick_at          TIMESTAMPTZ,
        created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_resources_player_id ON resources (player_id)`);
    await this.createUpdatedAtTrigger(queryRunner, 'resources');

    // ─── chat_messages ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id            UUID                              PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id     VARCHAR(255)                      NOT NULL,
        channel_type  chat_messages_channel_type_enum   NOT NULL,
        channel_id    VARCHAR(100),
        content       TEXT                              NOT NULL,
        is_deleted    BOOLEAN                           NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ                       NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages (sender_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages (channel_type)`);

    // ─── login_streaks ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS login_streaks (
        id                         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                    VARCHAR(255) NOT NULL UNIQUE,
        current_streak             INT          NOT NULL DEFAULT 0,
        longest_streak             INT          NOT NULL DEFAULT 0,
        last_claimed_date          VARCHAR(10),
        rescue_tokens              INT          NOT NULL DEFAULT 0,
        weekly_rescue_granted_at   TIMESTAMPTZ,
        created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await this.createUpdatedAtTrigger(queryRunner, 'login_streaks');

    // ─── loot_box_awards ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS loot_box_awards (
        id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR(255) NOT NULL,
        source      VARCHAR(64)  NOT NULL,
        items       JSONB        NOT NULL DEFAULT '[]'::jsonb,
        opened      BOOLEAN      NOT NULL DEFAULT FALSE,
        opened_at   TIMESTAMPTZ,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loot_box_awards_user ON loot_box_awards (user_id)`);

    // ─── player_daily_quests ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS player_daily_quests (
        id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           VARCHAR(255) NOT NULL,
        quest_date        VARCHAR(10)  NOT NULL,
        quest_type        VARCHAR(64)  NOT NULL,
        description       VARCHAR(255) NOT NULL,
        target_amount     INT          NOT NULL DEFAULT 1,
        progress          INT          NOT NULL DEFAULT 0,
        completed         BOOLEAN      NOT NULL DEFAULT FALSE,
        xp_reward         INT          NOT NULL DEFAULT 0,
        mineral_reward    INT          NOT NULL DEFAULT 0,
        gas_reward        INT          NOT NULL DEFAULT 0,
        energy_reward     INT          NOT NULL DEFAULT 0,
        awards_loot_box   BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT player_daily_quests_user_date_type_unique UNIQUE (user_id, quest_date, quest_type)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_player_daily_quests_user ON player_daily_quests (user_id)`);
    await this.createUpdatedAtTrigger(queryRunner, 'player_daily_quests');

    // ─── economy_building_configs ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS economy_building_configs (
        id                            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        building_type                 VARCHAR(50)   NOT NULL UNIQUE,
        base_mineral_per_hour         NUMERIC(10,4) NOT NULL DEFAULT 0,
        base_gas_per_hour             NUMERIC(10,4) NOT NULL DEFAULT 0,
        base_energy_per_hour          NUMERIC(10,4) NOT NULL DEFAULT 0,
        base_population_per_hour      NUMERIC(10,4) NOT NULL DEFAULT 0,
        energy_consumption_per_hour   NUMERIC(10,4) NOT NULL DEFAULT 0,
        level_scale_exponent          NUMERIC(6,4)  NOT NULL DEFAULT 1.25,
        description                   TEXT,
        created_at                    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at                    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await this.createUpdatedAtTrigger(queryRunner, 'economy_building_configs');

    // ─── economy_feature_flags ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS economy_feature_flags (
        id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        flag_key     VARCHAR(100)  NOT NULL UNIQUE,
        enabled      BOOLEAN       NOT NULL DEFAULT FALSE,
        variant      VARCHAR(50)   NOT NULL DEFAULT 'control',
        config       JSONB         NOT NULL DEFAULT '{}'::jsonb,
        description  TEXT,
        created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await this.createUpdatedAtTrigger(queryRunner, 'economy_feature_flags');

    // ─── economy_storage_configs ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS economy_storage_configs (
        id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type    VARCHAR(20)   NOT NULL UNIQUE,
        base_cap         INTEGER       NOT NULL,
        age_multipliers  NUMERIC[]     NOT NULL,
        description      TEXT,
        updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await this.createUpdatedAtTrigger(queryRunner, 'economy_storage_configs');

    // ─── guilds ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guilds (
        id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        name              VARCHAR(100)  NOT NULL UNIQUE,
        tag               VARCHAR(5)    NOT NULL UNIQUE,
        leader_id         VARCHAR(255)  NOT NULL,
        age_unlocked_at   TIMESTAMPTZ,
        tier_score        INT           NOT NULL DEFAULT 0,
        member_count      INT           NOT NULL DEFAULT 1,
        created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guilds_leader ON guilds (leader_id)`);
    await this.createUpdatedAtTrigger(queryRunner, 'guilds');

    // ─── guild_members ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_members (
        guild_id          UUID                        NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
        user_id           VARCHAR(255)                NOT NULL,
        role              guild_members_role_enum     NOT NULL DEFAULT 'member',
        joined_at         TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
        contribution_pts  INT                         NOT NULL DEFAULT 0,
        last_active_at    TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id, user_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members (user_id)`);

    // ─── guild_events ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_events (
        id          UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id    UUID                       NOT NULL,
        user_id     VARCHAR(255)               NOT NULL,
        type        guild_events_type_enum     NOT NULL,
        payload     JSONB                      NOT NULL DEFAULT '{}'::jsonb,
        created_at  TIMESTAMPTZ                NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_events_guild ON guild_events (guild_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guild_events_user ON guild_events (user_id)`);

    // ─── guild_tutorial_states ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guild_tutorial_states (
        id                  UUID                                  PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             VARCHAR(255)                          NOT NULL UNIQUE,
        tutorial_required   BOOLEAN                               NOT NULL DEFAULT FALSE,
        state               guild_tutorial_states_state_enum      NOT NULL DEFAULT 'not_started',
        reward_granted      BOOLEAN                               NOT NULL DEFAULT FALSE,
        completed_at        TIMESTAMPTZ,
        created_at          TIMESTAMPTZ                           NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ                           NOT NULL DEFAULT NOW()
      )
    `);
    await this.createUpdatedAtTrigger(queryRunner, 'guild_tutorial_states');

    // ─── era_packages ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS era_packages (
        id                            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                       VARCHAR(255)  NOT NULL,
        from_age                      INT           NOT NULL,
        to_age                        INT           NOT NULL,
        gold_granted                  INT           NOT NULL DEFAULT 0,
        gems_granted                  INT           NOT NULL DEFAULT 0,
        premium_currency_granted      INT           NOT NULL DEFAULT 0,
        unit_pack_count               INT           NOT NULL DEFAULT 0,
        production_boost_multiplier   NUMERIC(4,2)  NOT NULL DEFAULT 1,
        production_boost_expires_at   TIMESTAMPTZ,
        granted_at                    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT era_packages_user_to_age_unique UNIQUE (user_id, to_age)
      )
    `);

    // ─── player_levels ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS player_levels (
        id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           VARCHAR(255) NOT NULL UNIQUE,
        current_age       INT          NOT NULL DEFAULT 1,
        current_level     INT          NOT NULL DEFAULT 1,
        current_tier      INT          NOT NULL DEFAULT 1,
        current_xp        INT          NOT NULL DEFAULT 0,
        total_xp          INT          NOT NULL DEFAULT 0,
        unlocked_content  TEXT[]       NOT NULL DEFAULT '{}',
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await this.createUpdatedAtTrigger(queryRunner, 'player_levels');

    // ─── xp_threshold_config ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS xp_threshold_config (
        id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        source       VARCHAR(64)  NOT NULL UNIQUE,
        base_amount  INT          NOT NULL,
        updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await this.createUpdatedAtTrigger(queryRunner, 'xp_threshold_config');

    // ─── xp_transactions ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       VARCHAR(255) NOT NULL,
        source        VARCHAR(64)  NOT NULL,
        base_amount   INT          NOT NULL,
        multiplier    NUMERIC(4,2) NOT NULL DEFAULT 1.00,
        final_amount  INT          NOT NULL,
        level_before  INT          NOT NULL,
        level_after   INT          NOT NULL,
        reference_id  VARCHAR(255),
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_time ON xp_transactions (user_id, created_at)`);

    // ─── player_stamina ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS player_stamina (
        id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                  VARCHAR(255) NOT NULL UNIQUE,
        current_stamina          INT          NOT NULL DEFAULT 10,
        max_stamina              INT          NOT NULL DEFAULT 10,
        cost_per_battle          INT          NOT NULL DEFAULT 10,
        regen_interval_minutes   INT          NOT NULL DEFAULT 20,
        last_regen_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await this.createUpdatedAtTrigger(queryRunner, 'player_stamina');

    // ─── player_units ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS player_units (
        id           UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id    VARCHAR(255)               NOT NULL,
        type         player_units_type_enum     NOT NULL,
        race         player_units_race_enum     NOT NULL,
        hp           INTEGER                    NOT NULL,
        max_hp       INTEGER                    NOT NULL,
        attack       INTEGER                    NOT NULL,
        defense      INTEGER                    NOT NULL,
        speed        INTEGER                    NOT NULL,
        position_x   INTEGER                    NOT NULL DEFAULT 0,
        position_y   INTEGER                    NOT NULL DEFAULT 0,
        abilities    JSONB                      NOT NULL DEFAULT '[]'::jsonb,
        is_alive     BOOLEAN                    NOT NULL DEFAULT TRUE,
        created_at   TIMESTAMPTZ                NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ                NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_player_units_player ON player_units (player_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_player_units_player_alive ON player_units (player_id, is_alive)`);
    await this.createUpdatedAtTrigger(queryRunner, 'player_units');

    // ─── training_queue ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS training_queue (
        id           UUID                            PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id    VARCHAR(255)                    NOT NULL,
        building_id  VARCHAR(255)                    NOT NULL,
        unit_type    training_queue_unit_type_enum   NOT NULL,
        race         training_queue_race_enum        NOT NULL,
        completes_at TIMESTAMPTZ                     NOT NULL,
        is_complete  BOOLEAN                         NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ                     NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_training_queue_player ON training_queue (player_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_training_queue_player_pending ON training_queue (player_id, is_complete)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'training_queue',
      'player_units',
      'player_stamina',
      'xp_transactions',
      'xp_threshold_config',
      'player_levels',
      'era_packages',
      'guild_tutorial_states',
      'guild_events',
      'guild_members',
      'guilds',
      'economy_storage_configs',
      'economy_feature_flags',
      'economy_building_configs',
      'player_daily_quests',
      'loot_box_awards',
      'login_streaks',
      'chat_messages',
      'resources',
      'buildings',
      'players',
    ];
    for (const t of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
    }

    const enums = [
      'training_queue_race_enum',
      'training_queue_unit_type_enum',
      'player_units_race_enum',
      'player_units_type_enum',
      'guild_tutorial_states_state_enum',
      'guild_members_role_enum',
      'guild_events_type_enum',
      'chat_messages_channel_type_enum',
      'buildings_status_enum',
      'buildings_type_enum',
    ];
    for (const e of enums) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${e}`);
    }
  }

  private async createEnum(
    queryRunner: QueryRunner,
    name: string,
    values: string[],
  ): Promise<void> {
    const valuesSql = values.map((v) => `'${v}'`).join(', ');
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE ${name} AS ENUM (${valuesSql});
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
  }

  private async createUpdatedAtTrigger(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    const trigger = `trg_${table}_updated_at`;
    await queryRunner.query(`DROP TRIGGER IF EXISTS ${trigger} ON ${table}`);
    await queryRunner.query(`
      CREATE TRIGGER ${trigger}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }
}
