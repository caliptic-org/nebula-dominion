import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResearchSchema1746500000000 implements MigrationInterface {
  name = 'ResearchSchema1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE research_category_enum AS ENUM ('ekonomi', 'askeri', 'savunma')
    `);

    await queryRunner.query(`
      CREATE TYPE research_status_enum AS ENUM ('active', 'completed', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TABLE tech_nodes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        node_key VARCHAR(64) NOT NULL UNIQUE,
        race VARCHAR(64) NOT NULL,
        category research_category_enum NOT NULL,
        tier INT NOT NULL DEFAULT 0,
        row_position INT NOT NULL DEFAULT 0,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        icon VARCHAR(16) NOT NULL DEFAULT '🔬',
        effect_text VARCHAR(255) NOT NULL DEFAULT '',
        cost_mineral INT NOT NULL DEFAULT 0,
        cost_gas INT NOT NULL DEFAULT 0,
        duration_seconds INT NOT NULL DEFAULT 60,
        prerequisites JSONB NOT NULL DEFAULT '[]',
        effects JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_tech_nodes_race_category ON tech_nodes (race, category)`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_tech_nodes_node_key ON tech_nodes (node_key)`);

    await queryRunner.query(`
      CREATE TABLE player_research (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL,
        node_id UUID NOT NULL REFERENCES tech_nodes(id) ON DELETE CASCADE,
        status research_status_enum NOT NULL DEFAULT 'active',
        started_at TIMESTAMPTZ NOT NULL,
        estimated_completion_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_player_node UNIQUE (player_id, node_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_player_research_player_id ON player_research (player_id)`);
    await queryRunner.query(`CREATE INDEX idx_player_research_player_status ON player_research (player_id, status)`);

    // Seed tech nodes for the default race (nebula) using the frontend design reference
    await queryRunner.query(`
      INSERT INTO tech_nodes (node_key, race, category, tier, row_position, name, description, icon, effect_text, cost_mineral, cost_gas, duration_seconds, prerequisites, effects) VALUES
      -- Ekonomi tier 0
      ('ek-madencilik', 'nebula', 'ekonomi', 0, 0, 'Temel Madencilik', 'Mineral çıkarma kapasitesini artırır. Tüm madencilik yapıları %20 daha verimli çalışır ve depolama kapasitesi genişler.', '⛏️', '+20% Mineral Üretimi', 200, 0, 120, '[]', '{"mineralProductionBonus": 0.20}'),
      ('ek-enerji', 'nebula', 'ekonomi', 0, 1, 'Enerji Santrali', 'Taban enerji kapasitesini genişletir. Savunma yapılarına %30 enerji bonusu sağlar.', '⚡', '+30% Enerji Kapasitesi', 150, 50, 90, '[]', '{"energyCapacityBonus": 0.30}'),
      -- Ekonomi tier 1
      ('ek-rafine', 'nebula', 'ekonomi', 1, 0, 'Gelişmiş Rafine', 'Ham minerallerden daha fazla saf kaynak elde edilir. Depolama kapasitesi %40 artar, kayıp oranı minimize edilir.', '🔩', '+40% Mineral Verimliliği', 400, 100, 240, '["ek-madencilik"]', '{"mineralEfficiencyBonus": 0.40}'),
      ('ek-verimlilik', 'nebula', 'ekonomi', 1, 1, 'Enerji Verimliliği', 'Tüm yapıların enerji tüketimi azalır. Savaş gemilerinde yakıt tasarrufu sağlanır, üretim maliyeti düşer.', '💎', '-25% Enerji Tüketimi', 300, 150, 180, '["ek-enerji"]', '{"energyConsumptionReduction": 0.25}'),
      -- Ekonomi tier 2
      ('ek-mega', 'nebula', 'ekonomi', 2, 0, 'Mega Yapılar', 'Dev nebula yapıları inşa edilebilir. Her mega yapı bağımsız bir ekonomik merkez işlevi görür ve pasif kaynak üretir.', '🏗️', '+3 Mega Yapı Kapasitesi', 800, 300, 480, '["ek-rafine"]', '{"megaStructureSlots": 3}'),
      ('ek-kuantum', 'nebula', 'ekonomi', 2, 1, 'Kuantum Yakıt', 'Kuantum reaktörler sonsuz yakıt döngüsü oluşturur. Birlik hareket maliyetleri sıfıra iner, hızlı yeniden konumlanma aktif.', '🔮', '-100% Hareket Maliyeti', 600, 400, 420, '["ek-verimlilik"]', '{"movementCostReduction": 1.0}'),
      -- Askeri tier 0
      ('as-silah', 'nebula', 'askeri', 0, 0, 'Temel Silahlar', 'Tüm saldırı birimlerinin hasar değeri artırılır. Menzil +1 hex genişler, kritik vuruş şansı yükselir.', '🗡️', '+15% Saldırı Hasarı', 250, 50, 150, '[]', '{"attackDamageBonus": 0.15}'),
      ('as-egitim', 'nebula', 'askeri', 0, 1, 'Birlik Eğitimi', 'Birim eğitim süresi %20 azalır. Eğitim kapasitesi iki katına çıkar ve deneyim kazanma hızı artar.', '🎯', '-20% Eğitim Süresi', 200, 0, 100, '[]', '{"trainingTimeReduction": 0.20}'),
      -- Askeri tier 1
      ('as-taktik', 'nebula', 'askeri', 1, 0, 'Taktik Sistemler', 'Birimler düşman zayıflıklarını otomatik analiz eder. Flanklama bonusları %50 artar, pusu kurma yeteneği kazanılır.', '📡', '+50% Flanklama Bonusu', 450, 150, 300, '["as-silah"]', '{"flankingBonus": 0.50}'),
      ('as-zirh', 'nebula', 'askeri', 1, 1, 'Ağır Zırh', 'Frontline birimler için ağır zırh protokolü aktive edilir. HP %25 artar, hasar direnci %10 yükselir.', '🛡️', '+25% HP (Ön Saflar)', 350, 200, 240, '["as-egitim"]', '{"frontlineHpBonus": 0.25, "damageResistance": 0.10}'),
      -- Askeri tier 2
      ('as-nukleer', 'nebula', 'askeri', 2, 0, 'Nükleer Protokol', 'Nebula reaktör silahları kullanılabilir hale gelir. AoE hasar yetenekleri açılır, radyasyon yavaşlatma efekti aktif.', '☢️', 'AoE Nükleer Saldırı', 900, 350, 600, '["as-taktik"]', '{"aoeAttackUnlocked": true}'),
      ('as-titan', 'nebula', 'askeri', 2, 1, 'Titan Savaşçı', 'Her ırka özgü dev titan birimi oluşturulabilir. Savaş alanında dominant güç sağlar, karşı koyulamaz yıkım gücü.', '🤖', 'Titan Birimi Açılır', 750, 500, 540, '["as-zirh"]', '{"titanUnitUnlocked": true}'),
      -- Savunma tier 0
      ('sv-tahkimat', 'nebula', 'savunma', 0, 0, 'Temel Tahkimat', 'Savunma yapılarının dayanıklılığı artırılır. Kale HP %30 yükselir, hasar emme kapasitesi güçlenir.', '🏰', '+30% Savunma HP', 180, 30, 110, '[]', '{"defenseHpBonus": 0.30}'),
      ('sv-kalkan', 'nebula', 'savunma', 0, 1, 'Enerji Kalkanı', 'Enerji kalkanı modülü aktive edilir. Nebula tünellerinden gelen saldırılara karşı %20 hasar azaltma sağlar.', '🔵', '+20% Hasar Azaltma', 220, 80, 130, '[]', '{"shieldDamageReduction": 0.20}'),
      -- Savunma tier 1
      ('sv-kule', 'nebula', 'savunma', 1, 0, 'İleri Savunma Kuleleri', 'Savunma kulelerinin atış hızı ve menzili artar. Otomatik hedefleme sistemi eklenir.', '🗼', '+35% Kule Verimliliği', 400, 120, 270, '["sv-tahkimat"]', '{"towerEfficiencyBonus": 0.35}'),
      ('sv-alan', 'nebula', 'savunma', 1, 1, 'Alan Savunması', 'Birden fazla düşmana aynı anda hasar verebilen alan savunma sistemi.', '💥', 'AoE Savunma Aktif', 350, 180, 210, '["sv-kalkan"]', '{"aoeDefenseUnlocked": true}'),
      -- Savunma tier 2
      ('sv-kale', 'nebula', 'savunma', 2, 0, 'Kale Kalesi', 'Üs etrafında yıkılmaz bir nebula kale duvarı inşa edilir.', '🗺️', 'Nebula Kalesi Açılır', 850, 280, 520, '["sv-kule"]', '{"nebulaFortressUnlocked": true}'),
      ('sv-yenilmez', 'nebula', 'savunma', 2, 1, 'Yenilmez Zırh', 'Savunma birimlerine maksimum zırh protokolü uygulanır. Tüm birim kayıpları %40 azalır.', '⚜️', '-40% Birim Kaybı', 700, 450, 480, '["sv-alan"]', '{"unitLossReduction": 0.40}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS player_research`);
    await queryRunner.query(`DROP TABLE IF EXISTS tech_nodes`);
    await queryRunner.query(`DROP TYPE IF EXISTS research_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS research_category_enum`);
  }
}
