import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the commander equipment schema (tables + enums + indices) and
 * seeds the initial catalogue.
 *
 * Why one migration:
 *   - The `equipment_items` table is part of the canonical schema (same
 *     pattern as cosmetic_items + SeedCosmeticItems). Shipping the schema
 *     without rows means the slot picker has nothing to render, which is a
 *     bug, not a deferred state. Combining keeps prod + dev + smoke in
 *     lock-step.
 *
 * Schema:
 *   equipment_items    â€” catalogue of available items
 *   user_equipment     â€” per-user ownership rows, optionally bound to a commander
 *
 *   user_equipment.equipped_on_commander_id is a free-form varchar â€” commanders
 *   live in apps/web/src/app/commanders/data.ts as static slugs (voss, malphas,
 *   â€¦), not a DB table yet. Index on (user_id) and (equipped_on_commander_id)
 *   covers the inventory + per-commander-render hot paths.
 *
 * Seed matrix (15 items, 6 slots Ã— graded rarities):
 *   silah       (weapon)        common  / rare / epic
 *   zirh        (armor)         common  / rare / epic
 *   aksesuar_1  (accessory)     common  / rare
 *   aksesuar_2  (accessory)     common  / rare
 *   aksesuar_3  (accessory)     common  / rare
 *   ozel        (special slot)  rare    / legendary
 *   Note: aksesuar_2/3 carry one item each (rare) â€” slot stays selectable
 *   from day one but doesn't get bloated. Future migrations grow per-slot.
 *
 * Down: drops in reverse order. Enums dropped last because tables reference them.
 */

interface SeedRow {
  id: string;
  name: string;
  slot:
    | 'silah'
    | 'zirh'
    | 'aksesuar_1'
    | 'aksesuar_2'
    | 'aksesuar_3'
    | 'ozel';
  rarity: 'siradan' | 'yaygin' | 'nadir' | 'destansi' | 'efsanevi';
  atkBoost: number;
  defBoost: number;
  hpBoost: number;
  spdBoost: number;
  icon: string;
  description: string;
  sortOrder: number;
}

const ITEMS: SeedRow[] = [
  // â”€â”€ Silah (Weapons) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'e9000000-0000-4000-a000-000000000101',
    name: 'Plazma TabancasÄ±',
    slot: 'silah',
    rarity: 'siradan',
    atkBoost: 4,
    defBoost: 0,
    hpBoost: 0,
    spdBoost: 1,
    icon: 'ğŸ”«',
    description: 'Standart komuta seti â€” hÄ±zlÄ± atÄ±ÅŸlÄ± plazma tabancasÄ±.',
    sortOrder: 1,
  },
  {
    id: 'e9000000-0000-4000-a000-000000000102',
    name: 'Ä°yon KÄ±lÄ±cÄ±',
    slot: 'silah',
    rarity: 'nadir',
    atkBoost: 10,
    defBoost: 0,
    hpBoost: 0,
    spdBoost: 2,
    icon: 'âš”ï¸',
    description: 'Ä°yonize parÄ±ltÄ±yla yÃ¼klÃ¼ el silahÄ± â€” yakÄ±n savaÅŸta Ã¼stÃ¼n.',
    sortOrder: 2,
  },
  {
    id: 'e9000000-0000-4000-a000-000000000103',
    name: 'Nebula TÃ¼feÄŸi',
    slot: 'silah',
    rarity: 'destansi',
    atkBoost: 18,
    defBoost: 0,
    hpBoost: 0,
    spdBoost: 0,
    icon: 'ğŸ—¡ï¸',
    description: 'YÃ¼ksek menzilli nebula enerjili tÃ¼fek â€” kuÅŸatma sÄ±nÄ±fÄ±.',
    sortOrder: 3,
  },

  // â”€â”€ Zirh (Armor) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'e9000000-0000-4000-a000-000000000201',
    name: 'Taktik Yelek',
    slot: 'zirh',
    rarity: 'siradan',
    atkBoost: 0,
    defBoost: 5,
    hpBoost: 25,
    spdBoost: 0,
    icon: 'ğŸ¦º',
    description: 'Hafif kompozit panellerle gÃ¼Ã§lendirilmiÅŸ taktik yelek.',
    sortOrder: 11,
  },
  {
    id: 'e9000000-0000-4000-a000-000000000202',
    name: 'Kuvars ZÄ±rh',
    slot: 'zirh',
    rarity: 'nadir',
    atkBoost: 0,
    defBoost: 11,
    hpBoost: 50,
    spdBoost: -1,
    icon: 'ğŸ›¡ï¸',
    description: 'Kuvars-titanyum karÄ±ÅŸÄ±mÄ±, plazma hasarÄ±nÄ± daÄŸÄ±tan zÄ±rh.',
    sortOrder: 12,
  },
  {
    id: 'e9000000-0000-4000-a000-000000000203',
    name: 'Singularity ZÄ±rh',
    slot: 'zirh',
    rarity: 'destansi',
    atkBoost: 0,
    defBoost: 20,
    hpBoost: 90,
    spdBoost: -1,
    icon: 'ğŸ›¡ï¸',
    description: 'YÄ±kÄ±cÄ± Ã§ekim alanÄ±na dayanÄ±klÄ±, aÄŸÄ±r mÃ¼hendislik zÄ±rhÄ±.',
    sortOrder: 13,
  },

  // â”€â”€ Aksesuar_1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'e9000000-0000-4000-a000-000000000301',
    name: 'HÄ±z AmplifikatÃ¶rÃ¼',
    slot: 'aksesuar_1',
    rarity: 'siradan',
    atkBoost: 0,
    defBoost: 0,
    hpBoost: 0,
    spdBoost: 4,
    icon: 'ğŸ’¨',
    description: 'Bacak servoslarÄ±nÄ± hÄ±zlandÄ±ran kÃ¼Ã§Ã¼k amplifikatÃ¶r.',
    sortOrder: 21,
  },
  {
    id: 'e9000000-0000-4000-a000-000000000302',
    name: 'ReflektÃ¶r Kalkan',
    slot: 'aksesuar_1',
    rarity: 'nadir',
    atkBoost: 0,
    defBoost: 6,
    hpBoost: 20,
    spdBoost: 2,
    icon: 'ğŸ’',
    description: 'Lazer hasarÄ±nÄ± yansÄ±tan kompakt enerji kalkanÄ±.',
    sortOrder: 22,
  },

  // â”€â”€ Aksesuar_2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'e9000000-0000-4000-a000-000000000401',
    name: 'SaldÄ±rÄ± Ã‡ipi',
    slot: 'aksesuar_2',
    rarity: 'siradan',
    atkBoost: 3,
    defBoost: 0,
    hpBoost: 0,
    spdBoost: 0,
    icon: 'ğŸ’ ',
    description: 'DoÄŸrudan beyin-ara yÃ¼ze takÄ±lan saldÄ±rÄ± modÃ¼lÃ¼.',
    sortOrder: 31,
  },
  {
    id: 'e9000000-0000-4000-a000-000000000402',
    name: 'NÃ¶ro Booster',
    slot: 'aksesuar_2',
    rarity: 'nadir',
    atkBoost: 8,
    defBoost: 0,
    hpBoost: 0,
    spdBoost: 3,
    icon: 'ğŸ§ ',
    description: 'Refleksleri keskinleÅŸtiren nÃ¶ral hÄ±zlandÄ±rÄ±cÄ±.',
    sortOrder: 32,
  },

  // â”€â”€ Aksesuar_3 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'e9000000-0000-4000-a000-000000000501',
    name: 'Endurans ModÃ¼lÃ¼',
    slot: 'aksesuar_3',
    rarity: 'siradan',
    atkBoost: 0,
    defBoost: 2,
    hpBoost: 35,
    spdBoost: 0,
    icon: 'ğŸ”‹',
    description: 'VÃ¼cut sistemlerini stabilize eden enerji modÃ¼lÃ¼.',
    sortOrder: 41,
  },
  {
    id: 'e9000000-0000-4000-a000-000000000502',
    name: 'Åifa Sentezleyici',
    slot: 'aksesuar_3',
    rarity: 'nadir',
    atkBoost: 0,
    defBoost: 4,
    hpBoost: 75,
    spdBoost: 0,
    icon: 'ğŸ©¹',
    description: 'Yaralanmada otomatik mikro-onarÄ±m salgÄ±layan sentezleyici.',
    sortOrder: 42,
  },

  // â”€â”€ Ozel (Special slot, race-flavored hero gear) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'e9000000-0000-4000-a000-000000000601',
    name: 'Komuta TacÄ±',
    slot: 'ozel',
    rarity: 'nadir',
    atkBoost: 5,
    defBoost: 5,
    hpBoost: 30,
    spdBoost: 2,
    icon: 'ğŸ‘‘',
    description: 'Komutan rÃ¼tbesini taÅŸÄ±yanlara verilen onursal taÃ§ â€” dengeli boost.',
    sortOrder: 51,
  },
  {
    id: 'e9000000-0000-4000-a000-000000000602',
    name: 'Boyut YarÄ±ÄŸÄ± MÃ¼hrÃ¼',
    slot: 'ozel',
    rarity: 'efsanevi',
    atkBoost: 15,
    defBoost: 15,
    hpBoost: 100,
    spdBoost: 5,
    icon: 'âœ¨',
    description: 'YÄ±ldÄ±zlar arasÄ± rÃ¼nlerle Ã¶rÃ¼lmÃ¼ÅŸ, efsanevi savaÅŸ mÃ¼hrÃ¼.',
    sortOrder: 52,
  },
];

export class CreateEquipmentSchema1779800000000 implements MigrationInterface {
  name = 'CreateEquipmentSchema1779800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums (Postgres requires explicit type creation before column reference).
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE equipment_items_slot_enum AS ENUM (
          'silah','zirh','aksesuar_1','aksesuar_2','aksesuar_3','ozel'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE equipment_items_rarity_enum AS ENUM (
          'siradan','yaygin','nadir','destansi','efsanevi'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // equipment_items catalogue
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipment_items (
        id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name        varchar(200) NOT NULL,
        slot        equipment_items_slot_enum NOT NULL,
        rarity      equipment_items_rarity_enum NOT NULL DEFAULT 'siradan',
        atk_boost   integer NOT NULL DEFAULT 0,
        def_boost   integer NOT NULL DEFAULT 0,
        hp_boost    integer NOT NULL DEFAULT 0,
        spd_boost   integer NOT NULL DEFAULT 0,
        icon        varchar(50) NOT NULL,
        description text NOT NULL DEFAULT '',
        is_active   boolean NOT NULL DEFAULT true,
        sort_order  integer NOT NULL DEFAULT 0,
        created_at  timestamp without time zone NOT NULL DEFAULT now(),
        updated_at  timestamp without time zone NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_equipment_items_slot ON equipment_items(slot) WHERE is_active = true;`,
    );

    // user_equipment join table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_equipment (
        id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id                     varchar NOT NULL,
        equipment_id                uuid NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
        equipped_on_commander_id    varchar(100),
        acquired_at                 timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT uq_user_equipment_user_item UNIQUE (user_id, equipment_id)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_equipment_user ON user_equipment(user_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_equipment_commander ON user_equipment(equipped_on_commander_id) WHERE equipped_on_commander_id IS NOT NULL;`,
    );

    // Seed the catalogue.
    for (const row of ITEMS) {
      await queryRunner.query(
        `INSERT INTO equipment_items
           (id, name, slot, rarity, atk_boost, def_boost, hp_boost, spd_boost,
            icon, description, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          row.name,
          row.slot,
          row.rarity,
          row.atkBoost,
          row.defBoost,
          row.hpBoost,
          row.spdBoost,
          row.icon,
          row.description,
          row.sortOrder,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_equipment;`);
    await queryRunner.query(`DROP TABLE IF EXISTS equipment_items;`);
    await queryRunner.query(`DROP TYPE IF EXISTS equipment_items_rarity_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS equipment_items_slot_enum;`);
  }
}
