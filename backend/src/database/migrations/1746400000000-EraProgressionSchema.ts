import { MigrationInterface, QueryRunner } from 'typeorm';

export class EraProgressionSchema1746400000000 implements MigrationInterface {
  name = 'EraProgressionSchema1746400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enums ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE mini_quest_status AS ENUM ('active', 'completed', 'expired')
    `);

    // ─── Player era progress ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE player_era_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        current_era INT NOT NULL DEFAULT 1,
        era_transitioned_at TIMESTAMPTZ,
        mineral_snapshot INT NOT NULL DEFAULT 0,
        gas_snapshot INT NOT NULL DEFAULT 0,
        is_champion BOOLEAN NOT NULL DEFAULT FALSE,
        champion_achieved_at TIMESTAMPTZ,
        alliance_id UUID,
        username VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(player_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_pep_player ON player_era_progress (player_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_pep_champion ON player_era_progress (is_champion) WHERE is_champion = TRUE
    `);
    await queryRunner.query(`
      CREATE INDEX idx_pep_alliance ON player_era_progress (alliance_id) WHERE alliance_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_player_era_progress_updated_at
        BEFORE UPDATE ON player_era_progress
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // ─── Era catch-up packages ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE era_catchup_packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        era INT NOT NULL,
        production_boost_pct INT NOT NULL DEFAULT 50,
        production_boost_expires_at TIMESTAMPTZ NOT NULL,
        free_unit_type_code VARCHAR(64),
        free_unit_claimed BOOLEAN NOT NULL DEFAULT FALSE,
        free_unit_claimed_at TIMESTAMPTZ,
        player_era_progress_id UUID NOT NULL REFERENCES player_era_progress(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_ecp_player_era ON era_catchup_packages (player_id, era)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_ecp_boost_expiry ON era_catchup_packages (player_id, production_boost_expires_at)
    `);

    // ─── Era mini quests ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE era_mini_quests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        catchup_package_id UUID NOT NULL REFERENCES era_catchup_packages(id) ON DELETE CASCADE,
        quest_number INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        title_tr VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        description_tr TEXT NOT NULL,
        objective_type VARCHAR(64) NOT NULL,
        objective_target INT NOT NULL,
        objective_current INT NOT NULL DEFAULT 0,
        status mini_quest_status NOT NULL DEFAULT 'active',
        expires_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_emq_player_status ON era_mini_quests (player_id, status)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_emq_package ON era_mini_quests (catchup_package_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_emq_expires ON era_mini_quests (expires_at) WHERE status = 'active'
    `);

    // ─── Era mechanic unlocks ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE era_mechanic_unlocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        era INT NOT NULL,
        mechanic_code VARCHAR(64) NOT NULL,
        mechanic_name VARCHAR(128) NOT NULL,
        mechanic_name_tr VARCHAR(128) NOT NULL,
        unlocks_at TIMESTAMPTZ NOT NULL,
        is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
        tutorial_shown BOOLEAN NOT NULL DEFAULT FALSE,
        first_used_at TIMESTAMPTZ,
        player_era_progress_id UUID NOT NULL REFERENCES player_era_progress(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(player_id, mechanic_code)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_emu_player_era ON era_mechanic_unlocks (player_id, era)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_emu_unlock_schedule ON era_mechanic_unlocks (unlocks_at) WHERE is_unlocked = FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS era_mechanic_unlocks`);
    await queryRunner.query(`DROP TABLE IF EXISTS era_mini_quests`);
    await queryRunner.query(`DROP TABLE IF EXISTS era_catchup_packages`);
    await queryRunner.query(`DROP TABLE IF EXISTS player_era_progress`);
    await queryRunner.query(`DROP TYPE IF EXISTS mini_quest_status`);
  }
}
