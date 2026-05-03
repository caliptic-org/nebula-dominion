import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShopSchema1746500000000 implements MigrationInterface {
  name = 'ShopSchema1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE shop_category_enum AS ENUM ('genel', 'vip', 'lonca', 'etkinlik')
    `);

    await queryRunner.query(`
      CREATE TYPE product_tag_enum AS ENUM ('new', 'best', 'limited', 'hot')
    `);

    await queryRunner.query(`
      CREATE TYPE currency_enum AS ENUM ('gem', 'gold')
    `);

    await queryRunner.query(`
      CREATE TYPE purchase_status_enum AS ENUM ('pending', 'completed', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE shop_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(64) NOT NULL,
        category shop_category_enum NOT NULL,
        gem_price INT,
        gold_price INT,
        original_gem_price INT,
        original_gold_price INT,
        discount INT,
        stock INT,
        tag product_tag_enum,
        race_exclusive VARCHAR(64),
        bundle_contents JSONB NOT NULL DEFAULT '[]',
        featured BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_shop_products_category ON shop_products (category)`);
    await queryRunner.query(`CREATE INDEX idx_shop_products_race ON shop_products (race_exclusive)`);
    await queryRunner.query(`CREATE INDEX idx_shop_products_active ON shop_products (is_active)`);

    await queryRunner.query(`
      CREATE TABLE player_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL UNIQUE,
        gem INT NOT NULL DEFAULT 0,
        gold INT NOT NULL DEFAULT 0,
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX idx_player_wallets_player_id ON player_wallets (player_id)`);

    await queryRunner.query(`
      CREATE TABLE purchase_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        player_id UUID NOT NULL,
        product_id UUID NOT NULL,
        currency currency_enum NOT NULL,
        amount INT NOT NULL,
        status purchase_status_enum NOT NULL DEFAULT 'pending',
        gem_balance_after INT,
        gold_balance_after INT,
        failure_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX idx_purchase_idempotency ON purchase_transactions (idempotency_key)`);
    await queryRunner.query(`CREATE INDEX idx_purchase_player_date ON purchase_transactions (player_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_purchase_status ON purchase_transactions (status)`);

    await queryRunner.query(`
      CREATE TABLE game_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(64) NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_game_events_active ON game_events (is_active)`);
    await queryRunner.query(`CREATE INDEX idx_game_events_ends_at ON game_events (ends_at)`);

    // updated_at triggers
    await queryRunner.query(`
      CREATE TRIGGER update_shop_products_updated_at
        BEFORE UPDATE ON shop_products
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_player_wallets_updated_at
        BEFORE UPDATE ON player_wallets
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_game_events_updated_at
        BEFORE UPDATE ON game_events
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // Seed initial shop products matching the frontend design
    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gold_price, bundle_contents, sort_order) VALUES
        ('Kristal Paketi', '100 Nebula Kristali', '💎', 'genel', 800, '["100 💎 Nebula Kristali"]', 1),
        ('Kaynak Paketi', 'Mineral, Gas ve Energy dolumu', '⛏️', 'genel', 1200, '["1.000 Mineral","500 Gas","300 Energy"]', 5),
        ('Savaş Kalkanı', '8 saatlik saldırı koruması', '🛡️', 'genel', 640, '["8 Saat Koruma","PvP Saldırı Engeli"]', 6),
        ('Hız Katalizörü', 'Tüm üretimler 1 saat anında', '🚀', 'genel', 400, '["1 Saat Anında Üretim","Yapı & Birim"]', 7)
    `);

    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gold_price, original_gold_price, discount, tag, bundle_contents, sort_order) VALUES
        ('Kristal Demeti', '550 Kristal (+50 bonus)', '💎', 'genel', 4000, 4500, 10, 'hot', '["500 💎 Nebula Kristali","+50 💎 Bonus"]', 2),
        ('Kristal Hazinesi', '1440 Kristal (+240 bonus)', '💎', 'genel', 9000, 12000, 25, 'best', '["1200 💎 Nebula Kristali","+240 💎 Bonus","🎁 Özel Çerçeve"]', 3)
    `);

    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gem_price, gold_price, tag, bundle_contents, sort_order) VALUES
        ('XP Uyarıcı', '2× XP kazanımı 24 saat', '⚡', 'genel', 200, 1600, 'hot', '["2× XP × 24 saat","Anlık aktifleşme"]', 4)
    `);

    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gem_price, tag, bundle_contents, sort_order) VALUES
        ('VIP Deneme', '3 günlük VIP üyelik deneme', '👑', 'genel', 300, 'new', '["3 Gün VIP Üyelik","Tüm VIP Ayrıcalıkları","+1 İnşaat Kuyruğu"]', 8)
    `);

    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gem_price, original_gem_price, discount, tag, race_exclusive, stock, bundle_contents, sort_order) VALUES
        ('Kovan Paket', 'Zerg ırkına özel güç paketi', '🧬', 'genel', 500, 750, 33, 'limited', 'zerg', 50, '["Vex Thara Komutan Çerçevesi","5× Mutasyon Hızlandırıcı","2× Kovan Kalkanı","500 Mineral","300 Gas"]', 10),
        ('Grid Protokolü', 'Otomat ırkına özel şematik paket', '⚡', 'genel', 500, 750, 33, 'limited', 'otomat', 50, '["Demiurge Prime Çerçevesi","5× Hologram Booster","2× Enerji Kalkanı","400 Gas","200 Energy"]', 11),
        ('Kadim Kudret', 'Canavar ırkına özel güç paketi', '🔥', 'genel', 500, 750, 33, 'limited', 'canavar', 50, '["Khorvash Savaş Maskesi","5× Öfke Güçlendirmesi","2× Taş Zırhı","800 Mineral","200 Gas"]', 12),
        ('Genetik Savaşçı', 'İnsan ırkına özel teknoloji paketi', '🧪', 'genel', 500, 750, 33, 'limited', 'insan', 50, '["Voss Askeri Çerçevesi","5× Eğitim Hızlandırıcı","2× Savunma Mevzii","300 Mineral","500 Energy"]', 13),
        ('Lanet Paketi', 'Şeytan ırkına özel büyü paketi', '💀', 'genel', 500, 750, 33, 'limited', 'seytan', 50, '["Malphas Lanet Maskesi","5× Rune Güçlendirici","2× Gotik Kalkan","300 Mineral","400 Gas"]', 14)
    `);

    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gem_price, tag, featured, bundle_contents, sort_order) VALUES
        ('VIP Aylık', '30 gün tam VIP deneyimi', '👑', 'vip', 1000, NULL, FALSE, '["+1 İnşaat Kuyruğu","10% Kaynak Üretimi","2× Günlük Ödül","Özel VIP Profil Çerçevesi","Savaş Alanı Özel Giriş Efekti"]', 1),
        ('VIP Yıllık', '365 gün VIP + eşsiz ödüller', '🌟', 'vip', 8000, 'best', TRUE, '["+2 İnşaat Kuyruğu","15% Kaynak Üretimi","3× Günlük Ödül","Eşsiz VIP Altın Çerçeve","+1000 💎 Bonus","Tüm Irk Kostümleri","Yıllık Özel Komutan Skin"]', 3)
    `);

    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gem_price, original_gem_price, discount, tag, bundle_contents, sort_order) VALUES
        ('VIP 3 Aylık', '90 gün VIP + bonus kristal', '💎', 'vip', 2500, 3000, 17, 'hot', '["+1 İnşaat Kuyruğu","10% Kaynak Üretimi","2× Günlük Ödül","VIP Profil Çerçevesi","+200 💎 Bonus Kristal","Komutan XP Kartı × 3"]', 2)
    `);

    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gem_price, original_gem_price, discount, tag, stock, bundle_contents, sort_order) VALUES
        ('VIP Başlangıç', 'Yeni oyuncular için özel fırsat', '🎯', 'vip', 499, 800, 38, 'new', 1, '["7 Gün VIP","+50 💎 Kristal","2× XP Kartı","5× Hız Katalizörü","Başlangıç Çerçevesi"]', 4)
    `);

    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gem_price, gold_price, bundle_contents, sort_order) VALUES
        ('Lonca Kaynağı', 'Lonca ambarı için büyük kaynak dolumu', '⚓', 'lonca', 300, 2400, '["5.000 Lonca Minerali","2.500 Lonca Gazı","1.000 Lonca Enerjisi"]', 1),
        ('Teknoloji Hızlandırıcı', 'Lonca araştırmalarını hızlandır', '🔬', 'lonca', 200, 1600, '["Araştırma Hızlandırıcı × 5","Lonca Puanı × 300"]', 3)
    `);

    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gem_price, tag, bundle_contents, sort_order) VALUES
        ('Geliştirme Paketi', 'Lonca binası yükseltme hızlandırıcı', '🏗️', 'lonca', 500, 'hot', '["Lonca Ar-Ge × 2","Bina Seviye Atlama × 1","Lonca Puanı × 1000"]', 2),
        ('Lonca Kalkan Paketi', 'Lonca üyelerini düşman saldırılarından koru', '⚔️', 'lonca', 400, NULL, '["24h Lonca Kalkanı","Üye Koruması × 10","Kalkan Parçacık Efekti"]', 4)
    `);

    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gem_price, tag, stock, bundle_contents, sort_order) VALUES
        ('Galaksi Çerçevesi', 'Sınırlı sürüm kozmik profil çerçevesi', '🌌', 'etkinlik', 100, 'limited', 200, '["Galaksi Profil Çerçevesi","Animasyonlu Yıldız Efekti"]', 1),
        ('Galaksi Fatihi', 'Etkinlik mega paketi', '🌠', 'etkinlik', 800, 'limited', 25, '["Özel Galaksi Komutan Skin","Galaksi Harita Teması","5× Tüm Irk Paketi","1000 💎 Kristal","Animasyonlu Giriş Sahnesi"]', 3)
    `);

    await queryRunner.query(`
      INSERT INTO shop_products (name, description, icon, category, gem_price, original_gem_price, discount, tag, stock, bundle_contents, featured, sort_order) VALUES
        ('Kaşif Paketi', 'Etkinlik özel keşif paketi', '🔭', 'etkinlik', 250, 400, 37, 'hot', 100, '["Harita Kaşif Çerçevesi","Özel Hareket İzi Efekti","3× XP Booster","200 💎 Kristal"]', TRUE, 2)
    `);

    // Seed sample active event
    await queryRunner.query(`
      INSERT INTO game_events (name, description, type, ends_at, is_active, metadata) VALUES
        ('Galaksi Fethi Etkinliği', 'Sınırlı sürüm ürünleri indirimli fiyatlarla satın al', 'limited_sale', NOW() + INTERVAL '7 days', TRUE, '{"tab":"etkinlik","discount":40}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_game_events_updated_at ON game_events`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_player_wallets_updated_at ON player_wallets`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_shop_products_updated_at ON shop_products`);
    await queryRunner.query(`DROP TABLE IF EXISTS game_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_transactions`);
    await queryRunner.query(`DROP TABLE IF EXISTS player_wallets`);
    await queryRunner.query(`DROP TABLE IF EXISTS shop_products`);
    await queryRunner.query(`DROP TYPE IF EXISTS purchase_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS currency_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS product_tag_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS shop_category_enum`);
  }
}
