import { MigrationInterface, QueryRunner } from 'typeorm';

export class EquipmentSchema1746500000000 implements MigrationInterface {
  name = 'EquipmentSchema1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE equipment_slot_enum AS ENUM (
        'silah', 'zirh', 'aksesuar_1', 'aksesuar_2', 'aksesuar_3', 'ozel'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE equipment_rarity_enum AS ENUM (
        'siradan', 'yaygin', 'nadir', 'destansi', 'efsanevi'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE equipment_items (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slot equipment_slot_enum NOT NULL,
        rarity equipment_rarity_enum NOT NULL,
        icon VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        stats JSONB NOT NULL DEFAULT '{}'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE commanders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        locked_slots TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_commanders_player_id ON commanders (player_id)`);

    await queryRunner.query(`
      CREATE TRIGGER update_commanders_updated_at
        BEFORE UPDATE ON commanders
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TABLE player_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        item_id VARCHAR(255) NOT NULL REFERENCES equipment_items(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (player_id, item_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_player_inventory_player_id ON player_inventory (player_id)`);

    await queryRunner.query(`
      CREATE TABLE commander_equipment_slots (
        commander_id UUID NOT NULL,
        slot equipment_slot_enum NOT NULL,
        item_id VARCHAR(255) NOT NULL REFERENCES equipment_items(id),
        PRIMARY KEY (commander_id, slot),
        FOREIGN KEY (commander_id) REFERENCES commanders(id) ON DELETE CASCADE,
        UNIQUE (item_id)
      )
    `);

    await queryRunner.query(`
      INSERT INTO equipment_items (id, name, slot, rarity, icon, description, stats) VALUES
        ('eq_plasma_blade', 'Plazma Kılıç', 'silah', 'nadir', '⚡',
          'Saf enerjiyle şarj edilmiş titanyum kılıç.', '{"attack": 25, "speed": 5}'),
        ('eq_void_sword', 'Boşluk Kılıcı', 'silah', 'destansi', '🌀',
          'Boyutlar arası yarıktan çıkarılmış karanlık metal.', '{"attack": 45, "hp": -10}'),
        ('eq_legend_blade', 'Yıldız Parçası', 'silah', 'efsanevi', '⭐',
          'Çökmüş bir yıldızın çekirdeğinden şekillendirilmiş.', '{"attack": 70, "speed": 10}'),
        ('eq_titan_armor', 'Titan Zırhı', 'zirh', 'destansi', '🔩',
          'Titan kemiklerinden dövülmüş ağır zırh.', '{"defense": 50, "speed": -5}'),
        ('eq_phase_armor', 'Faz Zırhı', 'zirh', 'nadir', '🔷',
          'Holografik katmanlarla güçlendirilmiş hafif zırh.', '{"defense": 30, "hp": 20}'),
        ('eq_speed_ring', 'Hız Yüzüğü', 'aksesuar_1', 'yaygin', '💍',
          'Hareket hızını artıran kinetik enerji yüzüğü.', '{"speed": 15}'),
        ('eq_life_gem', 'Yaşam Taşı', 'aksesuar_2', 'nadir', '💚',
          'Biyoenerji kristali — savaşçının gücünü artırır.', '{"hp": 40}'),
        ('eq_nebula_charm', 'Nebula Muskası', 'aksesuar_3', 'siradan', '🌌',
          'Eski uzay ritüellerinden kalma denge muskası.', '{"defense": 5, "attack": 5}'),
        ('eq_core_implant', 'Çekirdek İmplantı', 'ozel', 'efsanevi', '🧠',
          'Tüm istatistikleri artıran nöral komuta çekirdeği.', '{"attack": 30, "defense": 30, "speed": 20, "hp": 50}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS commander_equipment_slots`);
    await queryRunner.query(`DROP TABLE IF EXISTS player_inventory`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_commanders_updated_at ON commanders`);
    await queryRunner.query(`DROP TABLE IF EXISTS commanders`);
    await queryRunner.query(`DROP TABLE IF EXISTS equipment_items`);
    await queryRunner.query(`DROP TYPE IF EXISTS equipment_rarity_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS equipment_slot_enum`);
  }
}
