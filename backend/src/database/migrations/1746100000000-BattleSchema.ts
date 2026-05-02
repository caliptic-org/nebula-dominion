import { MigrationInterface, QueryRunner } from 'typeorm';

export class BattleSchema1746100000000 implements MigrationInterface {
  name = 'BattleSchema1746100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE battle_status_enum AS ENUM ('pending', 'in_progress', 'completed', 'abandoned')
    `);

    await queryRunner.query(`
      CREATE TYPE battle_action_type_enum AS ENUM ('attack', 'defend', 'surrender')
    `);

    await queryRunner.query(`
      CREATE TABLE battles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attacker_id UUID NOT NULL,
        defender_id UUID NOT NULL,
        status battle_status_enum NOT NULL DEFAULT 'pending',
        winner_id UUID,
        attacker_army JSONB NOT NULL,
        defender_army JSONB NOT NULL,
        attacker_army_state JSONB,
        defender_army_state JSONB,
        current_turn INT NOT NULL DEFAULT 0,
        current_turn_side VARCHAR(16) NOT NULL DEFAULT 'attacker',
        replay_key VARCHAR(512),
        started_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_battles_attacker_id ON battles (attacker_id)`);
    await queryRunner.query(`CREATE INDEX idx_battles_defender_id ON battles (defender_id)`);
    await queryRunner.query(`CREATE INDEX idx_battles_status ON battles (status)`);
    await queryRunner.query(`CREATE INDEX idx_battles_created_at ON battles (created_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE battle_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
        turn_number INT NOT NULL,
        action_type battle_action_type_enum NOT NULL DEFAULT 'attack',
        actor_player_id UUID NOT NULL,
        actor_unit_id UUID NOT NULL,
        actor_unit_name VARCHAR(255) NOT NULL,
        target_unit_id UUID,
        target_unit_name VARCHAR(255),
        base_damage INT NOT NULL DEFAULT 0,
        final_damage INT NOT NULL DEFAULT 0,
        critical_hit BOOLEAN NOT NULL DEFAULT FALSE,
        blocked_damage INT NOT NULL DEFAULT 0,
        target_remaining_hp INT NOT NULL DEFAULT 0,
        unit_killed BOOLEAN NOT NULL DEFAULT FALSE,
        attacker_army_state JSONB NOT NULL,
        defender_army_state JSONB NOT NULL,
        state_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_battle_logs_battle_id ON battle_logs (battle_id)`);
    await queryRunner.query(`CREATE INDEX idx_battle_logs_battle_turn ON battle_logs (battle_id, turn_number)`);

    // Trigger to auto-update battles.updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_battles_updated_at
        BEFORE UPDATE ON battles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_battles_updated_at ON battles`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column`);
    await queryRunner.query(`DROP TABLE IF EXISTS battle_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS battles`);
    await queryRunner.query(`DROP TYPE IF EXISTS battle_action_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS battle_status_enum`);
  }
}
