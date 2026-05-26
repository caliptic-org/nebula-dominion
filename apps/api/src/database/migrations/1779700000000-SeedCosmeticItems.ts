import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the cosmetic_items catalogue.
 *
 * Why a migration (not a separate seed script):
 *   - The `cosmetic_items` table is part of the canonical schema (see
 *     1779525000000-InitialSchema) and is required for the customisation
 *     screen to render anything at all. An empty table is a bug, not a
 *     deferred state, so the data ships with the schema.
 *   - Migrations are the only mechanism that runs in every environment
 *     (dev/staging/prod) through the same code path. A standalone seed
 *     script would need separate wiring + ordering against schema rollouts.
 *   - Deterministic UUIDs (hard-coded below) make this rerunnable: the
 *     down() reverses by id, and a subsequent dataset-evolution migration
 *     can UPDATE/INSERT individual rows without UUID drift between envs.
 *
 * Matrix shape:
 *   5 races (insan, zerg, otomat, canavar, seytan)
 *   × 4 categories (skin, frame, title, effect)
 *   = 20 race-flavoured items, plus 5 cross-race bonus items = 25 total.
 *
 * Rarity distribution (target ~50/30/15/5):
 *   common:    13 items (52%) — price_gems = NULL (free starter pool)
 *   rare:       7 items (28%) — price_gems = 200
 *   epic:       4 items (16%) — price_gems = 500
 *   legendary:  1 item   (4%) — price_gems = 1500
 *
 * Note: the entity defines 4 categories — skin, frame, title, effect — not
 * (avatar/banner/emote). The task description's "avatar/frame/banner/emote"
 * was a phrasing mismatch; the entity + initial-schema enum is the source
 * of truth, so we seed against the real category set.
 */

interface SeedRow {
  id: string;
  name: string;
  category: 'skin' | 'frame' | 'title' | 'effect';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  priceGems: number | null;
  icon: string;
  description: string;
  sortOrder: number;
}

const ITEMS: SeedRow[] = [
  // ── Insan (Humans) ──────────────────────────────────────────────────────
  {
    id: '11111111-1111-4111-a111-000000000001',
    name: 'İnsan Komutan Zırhı',
    category: 'skin',
    rarity: 'common',
    priceGems: null,
    icon: '🪖',
    description: 'Terran filo komutanlarının standart taktik zırhı.',
    sortOrder: 1,
  },
  {
    id: '11111111-1111-4111-a111-000000000002',
    name: 'İnsan Sancağı',
    category: 'frame',
    rarity: 'common',
    priceGems: null,
    icon: '🛡️',
    description: 'Terran Konseyi mührüyle çerçevelenmiş profil sınırı.',
    sortOrder: 2,
  },
  {
    id: '11111111-1111-4111-a111-000000000003',
    name: 'Filo Komutanı',
    category: 'title',
    rarity: 'rare',
    priceGems: 200,
    icon: '⭐',
    description: 'Üç sektörü yöneten İnsan komuta zincirinin unvanı.',
    sortOrder: 3,
  },
  {
    id: '11111111-1111-4111-a111-000000000004',
    name: 'Plazma Kıvılcımı',
    category: 'effect',
    rarity: 'rare',
    priceGems: 200,
    icon: '⚡',
    description: 'İnsan teknolojisinin imzası — mavi plazma izleri.',
    sortOrder: 4,
  },

  // ── Zerg (Bio swarm) ────────────────────────────────────────────────────
  {
    id: '22222222-2222-4222-a222-000000000001',
    name: 'Zerg Karapas',
    category: 'skin',
    rarity: 'common',
    priceGems: null,
    icon: '🦂',
    description: 'Biyo-zırhla kaplı, sürünün damgasını taşıyan görünüm.',
    sortOrder: 5,
  },
  {
    id: '22222222-2222-4222-a222-000000000002',
    name: 'Hücresel Çerçeve',
    category: 'frame',
    rarity: 'rare',
    priceGems: 200,
    icon: '🧬',
    description: 'Canlı dokudan örülmüş, nabız atan organik sınır.',
    sortOrder: 6,
  },
  {
    id: '22222222-2222-4222-a222-000000000003',
    name: 'Sürü Anası',
    category: 'title',
    rarity: 'common',
    priceGems: null,
    icon: '🪱',
    description: 'Zerg kovanını besleyen genetik soydan inenlere.',
    sortOrder: 7,
  },
  {
    id: '22222222-2222-4222-a222-000000000004',
    name: 'Spor Bulutu',
    category: 'effect',
    rarity: 'epic',
    priceGems: 500,
    icon: '🍄',
    description: 'Karakterin etrafında dönen yeşil biyo-spor partikülleri.',
    sortOrder: 8,
  },

  // ── Otomat (Synthetic) ──────────────────────────────────────────────────
  {
    id: '33333333-3333-4333-a333-000000000001',
    name: 'Otomat Çekirdek Kabuğu',
    category: 'skin',
    rarity: 'common',
    priceGems: null,
    icon: '🤖',
    description: 'Krom-titanyum gövde — sentetik birliğin standart şasisi.',
    sortOrder: 9,
  },
  {
    id: '33333333-3333-4333-a333-000000000002',
    name: 'Devre Çerçeve',
    category: 'frame',
    rarity: 'common',
    priceGems: null,
    icon: '🔲',
    description: 'PCB izleriyle çizilmiş geometrik profil sınırı.',
    sortOrder: 10,
  },
  {
    id: '33333333-3333-4333-a333-000000000003',
    name: 'Çekirdek Mimarı',
    category: 'title',
    rarity: 'rare',
    priceGems: 200,
    icon: '🛠️',
    description: 'Otomat hesaplama matrislerini şekillendiren mühendis unvanı.',
    sortOrder: 11,
  },
  {
    id: '33333333-3333-4333-a333-000000000004',
    name: 'Veri Tayfı',
    category: 'effect',
    rarity: 'rare',
    priceGems: 200,
    icon: '📡',
    description: 'Karakter etrafında akan holografik veri akışları.',
    sortOrder: 12,
  },

  // ── Canavar (Beast) ─────────────────────────────────────────────────────
  {
    id: '44444444-4444-4444-a444-000000000001',
    name: 'Canavar Pençe Zırhı',
    category: 'skin',
    rarity: 'common',
    priceGems: null,
    icon: '🐺',
    description: 'Vahşi avcının pençelerle güçlendirilmiş savaş kılığı.',
    sortOrder: 13,
  },
  {
    id: '44444444-4444-4444-a444-000000000002',
    name: 'Kan Sancağı',
    category: 'frame',
    rarity: 'common',
    priceGems: null,
    icon: '🩸',
    description: 'Canavar klanlarının kan rengiyle boyanmış çerçeve.',
    sortOrder: 14,
  },
  {
    id: '44444444-4444-4444-a444-000000000003',
    name: 'Avcı Lordu',
    category: 'title',
    rarity: 'rare',
    priceGems: 200,
    icon: '🏹',
    description: 'Üç gezegende av kayıtlarını kıran Canavar lordu unvanı.',
    sortOrder: 15,
  },
  {
    id: '44444444-4444-4444-a444-000000000004',
    name: 'Kızgın Buhar',
    category: 'effect',
    rarity: 'epic',
    priceGems: 500,
    icon: '🔥',
    description: 'Canavar nefesinden yükselen turuncu-kızıl ısı dalgaları.',
    sortOrder: 16,
  },

  // ── Seytan (Demon) ──────────────────────────────────────────────────────
  {
    id: '55555555-5555-4555-a555-000000000001',
    name: 'Şeytan Ruh Cüppesi',
    category: 'skin',
    rarity: 'common',
    priceGems: null,
    icon: '👹',
    description: 'Karanlık maddeden dokunmuş, gölgelere bürünen cüppe.',
    sortOrder: 17,
  },
  {
    id: '55555555-5555-4555-a555-000000000002',
    name: 'Lanet Sigili',
    category: 'frame',
    rarity: 'rare',
    priceGems: 200,
    icon: '🔯',
    description: 'Antik şeytan mührüyle çerçevelenmiş kara büyü sınırı.',
    sortOrder: 18,
  },
  {
    id: '55555555-5555-4555-a555-000000000003',
    name: 'Karanlık Lord',
    category: 'title',
    rarity: 'epic',
    priceGems: 500,
    icon: '💀',
    description: 'Karanlık madde lejyonlarını yönetenler için ayrılmış unvan.',
    sortOrder: 19,
  },
  {
    id: '55555555-5555-4555-a555-000000000004',
    name: 'Cehennem Alevi',
    category: 'effect',
    rarity: 'legendary',
    priceGems: 1500,
    icon: '👑',
    description: 'Yalnızca efsanevi şeytan lordlarına tanınan kor halesi.',
    sortOrder: 20,
  },

  // ── Cross-race bonus pool (universal cosmetics) ─────────────────────────
  {
    id: '99999999-9999-4999-a999-000000000001',
    name: 'Nebula Yıldız Tozu',
    category: 'frame',
    rarity: 'epic',
    priceGems: 500,
    icon: '🌌',
    description: 'Galaktik nebuladan toplanmış mavi-mor parıltılı çerçeve.',
    sortOrder: 21,
  },
  {
    id: '99999999-9999-4999-a999-000000000002',
    name: 'Galaksi Fatihi',
    category: 'title',
    rarity: 'common',
    priceGems: null,
    icon: '🌠',
    description: 'İlk sezon kampanyasını tamamlayanlara verilen onursal unvan.',
    sortOrder: 22,
  },
  {
    id: '99999999-9999-4999-a999-000000000003',
    name: 'Statik Yük',
    category: 'effect',
    rarity: 'common',
    priceGems: null,
    icon: '✨',
    description: 'Hafif elektrostatik parçacık efekti — varsayılan dekor.',
    sortOrder: 23,
  },
  {
    id: '99999999-9999-4999-a999-000000000004',
    name: 'Pilot Kıyafeti',
    category: 'skin',
    rarity: 'common',
    priceGems: null,
    icon: '🚀',
    description: 'Hafif ve aerodinamik nebula uçuş takımı.',
    sortOrder: 24,
  },
  {
    id: '99999999-9999-4999-a999-000000000005',
    name: 'Standart Çerçeve',
    category: 'frame',
    rarity: 'common',
    priceGems: null,
    icon: '▫️',
    description: 'Minimal, ırk-bağımsız varsayılan profil sınırı.',
    sortOrder: 25,
  },
];

export class SeedCosmeticItems1779700000000 implements MigrationInterface {
  name = 'SeedCosmeticItems1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const row of ITEMS) {
      await queryRunner.query(
        `INSERT INTO cosmetic_items
           (id, name, category, rarity, price_gems, icon, description,
            preview_image, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, true, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          row.name,
          row.category,
          row.rarity,
          row.priceGems,
          row.icon,
          row.description,
          row.sortOrder,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const ids = ITEMS.map((r) => r.id);
    await queryRunner.query(
      `DELETE FROM cosmetic_items WHERE id = ANY($1::uuid[])`,
      [ids],
    );
  }
}
