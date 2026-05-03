import { MigrationInterface, QueryRunner } from 'typeorm';

export class FormationsSchema1746500000000 implements MigrationInterface {
  name = 'FormationsSchema1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE formation_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        unit_slots JSONB NOT NULL DEFAULT '[]',
        commander_slots JSONB NOT NULL DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      INSERT INTO formation_templates (name, description, unit_slots, commander_slots)
      VALUES
        ('Saldırı', 'Maksimum saldırı gücü için agresif ileri formasyon', '[]', '[]'),
        ('Savunma', 'Birim hayatta kalımını önceliklendiren savunmacı formasyon', '[]', '[]'),
        ('Dengeli', 'Eşit saldırı ve savunma kapasiteli karma formasyon', '[]', '[]'),
        ('Hızlı Baskın', 'Maksimum hız ve ani saldırı odaklı formasyon', '[]', '[]'),
        ('Kale', 'Yüksek savunma puanı, minimum birim sayısı formatı', '[]', '[]')
    `);

    await queryRunner.query(`
      CREATE TABLE formations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        unit_slots JSONB NOT NULL DEFAULT '[]',
        commander_slots JSONB NOT NULL DEFAULT '[]',
        template_id UUID REFERENCES formation_templates(id) ON DELETE SET NULL,
        is_last_active BOOLEAN NOT NULL DEFAULT FALSE,
        total_power INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_formations_player_id ON formations (player_id)`);
    await queryRunner.query(`CREATE INDEX idx_formations_player_active ON formations (player_id, is_active)`);
    await queryRunner.query(`CREATE INDEX idx_formations_last_active ON formations (player_id, is_last_active) WHERE is_last_active = TRUE`);

    await queryRunner.query(`
      CREATE TRIGGER update_formations_updated_at
        BEFORE UPDATE ON formations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_formations_updated_at ON formations`);
    await queryRunner.query(`DROP TABLE IF EXISTS formations`);
    await queryRunner.query(`DROP TABLE IF EXISTS formation_templates`);
  }
}
