import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnitsSchema1746200000000 implements MigrationInterface {
  name = 'UnitsSchema1746200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      CREATE TYPE unit_race_enum AS ENUM ('human', 'zerg', 'droid', 'creature', 'demon')
    `);

    // Units table
    await queryRunner.query(`
      CREATE TABLE units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        race unit_race_enum NOT NULL,
        tier_level INT NOT NULL DEFAULT 1,
        attack INT NOT NULL DEFAULT 10,
        defense INT NOT NULL DEFAULT 5,
        hp INT NOT NULL DEFAULT 100,
        max_hp INT NOT NULL DEFAULT 100,
        speed INT NOT NULL DEFAULT 10,
        abilities JSONB NOT NULL DEFAULT '[]',
        merge_count INT NOT NULL DEFAULT 0,
        parent_unit_ids JSONB NOT NULL DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_units_player_id ON units (player_id)`);
    await queryRunner.query(`CREATE INDEX idx_units_player_active ON units (player_id, is_active)`);
    await queryRunner.query(`CREATE INDEX idx_units_race ON units (race)`);

    await queryRunner.query(`
      CREATE TRIGGER update_units_updated_at
        BEFORE UPDATE ON units
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // Mutation rules table
    await queryRunner.query(`
      CREATE TABLE mutation_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_race_1 unit_race_enum NOT NULL,
        source_race_2 unit_race_enum NOT NULL,
        min_tier_level INT NOT NULL DEFAULT 1,
        result_race unit_race_enum NOT NULL,
        result_name_template VARCHAR(255) NOT NULL,
        attack_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
        defense_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
        hp_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
        speed_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
        bonus_abilities JSONB NOT NULL DEFAULT '[]',
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_mutation_rules_races ON mutation_rules (source_race_1, source_race_2)`);

    // ─── Seed: Same-race evolution rules (tier+1) ───────────────────────────
    await queryRunner.query(`
      INSERT INTO mutation_rules
        (source_race_1, source_race_2, min_tier_level, result_race, result_name_template,
         attack_multiplier, defense_multiplier, hp_multiplier, speed_multiplier,
         bonus_abilities, description)
      VALUES
        ('human', 'human', 1, 'human', 'Veteran [name]',
         1.15, 1.10, 1.10, 1.05, '[]',
         'Two humans fuse into a battle-hardened veteran, gaining combat experience and resilience.'),

        ('zerg', 'zerg', 1, 'zerg', 'Elite [name]',
         1.20, 1.05, 1.15, 1.10, '["hive_mind"]',
         'Zerg units merge into an elite bio-construct, hyper-aggressive with a shared hive consciousness.'),

        ('droid', 'droid', 1, 'droid', 'Advanced [name]',
         1.10, 1.20, 1.05, 1.05, '["fortified"]',
         'Two droids integrate their hardware, producing an advanced unit with reinforced armor plating.'),

        ('creature', 'creature', 1, 'creature', 'Alpha [name]',
         1.15, 1.10, 1.20, 1.10, '["regeneration"]',
         'Two creatures compete and merge, the survivor absorbing the other to become an apex predator.'),

        ('demon', 'demon', 1, 'demon', 'Arcane [name]',
         1.25, 1.15, 1.10, 1.05, '["void_armor"]',
         'Demonic essences fuse into a more powerful form, radiating void energy.')
    `);

    // ─── Seed: Cross-race hybrid mutation rules ─────────────────────────────
    await queryRunner.query(`
      INSERT INTO mutation_rules
        (source_race_1, source_race_2, min_tier_level, result_race, result_name_template,
         attack_multiplier, defense_multiplier, hp_multiplier, speed_multiplier,
         bonus_abilities, description)
      VALUES
        ('human', 'zerg', 3, 'zerg', 'Infested [name]',
         1.20, 1.05, 1.10, 1.10, '["hive_mind"]',
         'A human host is infested by zerg biomass, retaining tactical intelligence but gaining colony aggression.'),

        ('human', 'droid', 3, 'droid', 'Cyborg [name]',
         1.10, 1.20, 1.05, 1.15, '["fortified"]',
         'Human consciousness is uploaded into a cybernetic chassis, gaining mechanical durability and precision.'),

        ('human', 'creature', 3, 'creature', 'Feral [name]',
         1.15, 1.10, 1.15, 1.20, '["berserker"]',
         'A human bonds with a creature at the genetic level, unleashing primal fury while retaining intellect.'),

        ('human', 'demon', 5, 'demon', 'Corrupted [name]',
         1.20, 1.10, 1.10, 1.05, '["corrosive"]',
         'A human soul is consumed and reforged by demonic power, radiating corruption that weakens enemies.'),

        ('zerg', 'droid', 5, 'droid', 'Bio-Mech [name]',
         1.15, 1.20, 1.10, 1.05, '["fortified", "corrosive"]',
         'Zerg biomass integrates with droid circuitry, producing a self-repairing machine with acid-etched plating.'),

        ('zerg', 'creature', 3, 'zerg', 'Apex [name]',
         1.25, 1.10, 1.15, 1.15, '["berserker"]',
         'The most aggressive traits of zerg and creature merge into an apex predator that enters a frenzy at low HP.'),

        ('zerg', 'demon', 7, 'demon', 'Void Spawn [name]',
         1.25, 1.10, 1.10, 1.10, '["void_armor", "hive_mind"]',
         'Zerg biology twisted by demonic void energy produces a terrifying entity that ignores part of incoming damage.'),

        ('droid', 'creature', 5, 'droid', 'Organic-Mech [name]',
         1.10, 1.25, 1.15, 1.05, '["regeneration"]',
         'Organic tissue woven through a droid frame grants biological regeneration while maintaining armored defense.'),

        ('droid', 'demon', 7, 'demon', 'Infernal-Mech [name]',
         1.20, 1.20, 1.05, 1.10, '["void_armor"]',
         'Infernal energy powers a droid chassis, granting unholy resilience and mechanical precision.'),

        ('creature', 'demon', 7, 'creature', 'Chaos Beast [name]',
         1.30, 1.05, 1.15, 1.10, '["berserker", "corrosive"]',
         'A creature consumed by demonic chaos becomes an unstoppable engine of destruction, corroding anything it touches.')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_units_updated_at ON units`);
    await queryRunner.query(`DROP TABLE IF EXISTS mutation_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS units`);
    await queryRunner.query(`DROP TYPE IF EXISTS unit_race_enum`);
  }
}
