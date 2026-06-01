/**
 * Gate Rules — single source-of-truth for "what unlocks when" across the game.
 *
 * Driven by the story-bible (Hikaye Kitabı v1.0) tier ladder + the existing
 * scattered minAge / minLevel constants (XP_SOURCE_MIN_AGE, quest-pool minAge,
 * commander tier gates). One file per project-wide rule so changing a balance
 * number doesn't require chasing components.
 *
 * Each button (or screen, or feature) in the game gets a `gateId`. The rules
 * are evaluated against the live player state by GatesService and returned to
 * the frontend via GET /api/progression/gates. The frontend then renders the
 * inline subtitle + tap-modal explanation defined by GatedButton.
 *
 * Rule severity:
 *   - hard: level / age / building / quest. Player cannot bypass.
 *   - soft: resource / time / cost. Player can fulfill in-session.
 *
 * Adding a new gate:
 *   1. Add the gateId + rule list here.
 *   2. Wrap the button with <GatedButton gateId="...">.
 *   3. Backend automatically enforces (or hint-only — see `enforce` flag).
 */

export type GateRule =
  | { type: 'always_on' }
  | { type: 'level'; min: number }
  | { type: 'age'; min: number }
  | { type: 'building'; buildingType: string; minLevel?: number }
  | { type: 'unit'; unitType: string; minCount?: number }
  | { type: 'resource'; resource: 'minerals' | 'gas' | 'energy' | 'science'; min: number }
  | { type: 'race'; race: 'human' | 'zerg' | 'automaton' | 'beast' | 'demon' };

/**
 * Gate rules per button/feature/screen. The key is the `gateId` used by
 * frontend <GatedButton> and backend GatesService. Keep it kebab-case and
 * scoped (e.g. `base.build.solar_plant`, `pvp.matchmake`, `guild.create`).
 *
 * When in doubt — the story-bible chapter & section is referenced in comments
 * (Hikaye Kitabı §2.X for age, §3.X for race lore).
 */
export const GATE_RULES: Record<string, GateRule[]> = {
  // ── Always-on bootstraps ─────────────────────────────────────────────────
  'auth.register':                [{ type: 'always_on' }],
  'auth.login':                   [{ type: 'always_on' }],
  'race.select':                  [{ type: 'always_on' }],

  // ── Çağ 1 (Gezegensel Uyanış, Lv 1-9) — building catalog ─────────────────
  // The starter command center comes pre-built at registration. Resource
  // extractors gate behind it being upgraded so the player can't skip the
  // first level-up. After that the catalog opens up gradually.
  'base.build.command_center':    [{ type: 'always_on' }],  // pre-seeded; click → upgrade flow
  'base.build.mineral_extractor': [{ type: 'building', buildingType: 'command_center', minLevel: 1 }],
  'base.build.gas_refinery':      [{ type: 'building', buildingType: 'command_center', minLevel: 2 }],
  'base.build.solar_plant':       [{ type: 'building', buildingType: 'command_center', minLevel: 2 }],
  'base.build.barracks':          [{ type: 'level', min: 3 }, { type: 'building', buildingType: 'command_center', minLevel: 2 }],
  'base.build.turret':            [{ type: 'level', min: 4 }, { type: 'building', buildingType: 'barracks', minLevel: 1 }],
  'base.build.shield_generator':  [{ type: 'level', min: 5 }],
  'base.build.research_lab':      [{ type: 'building', buildingType: 'command_center', minLevel: 3 }],
  'base.build.academy':           [{ type: 'building', buildingType: 'research_lab', minLevel: 1 }],
  'base.build.factory':           [{ type: 'level', min: 6 }, { type: 'building', buildingType: 'command_center', minLevel: 4 }],
  'base.build.hangar':            [{ type: 'level', min: 7 }],  // Çağ 1.8 "Şehir" — first big production
  'base.build.spawning_pool':     [{ type: 'race', race: 'zerg' }],
  'base.build.hatchery':          [{ type: 'race', race: 'zerg' }, { type: 'building', buildingType: 'spawning_pool', minLevel: 1 }],

  // ── Unit production (per building) ───────────────────────────────────────
  'production.train_marine':      [{ type: 'building', buildingType: 'barracks', minLevel: 1 }],
  'production.train_tank':        [{ type: 'building', buildingType: 'factory',  minLevel: 1 }],
  'production.train_fighter':     [{ type: 'building', buildingType: 'hangar',   minLevel: 1 }],
  'production.train_zergling':    [{ type: 'race', race: 'zerg' }, { type: 'building', buildingType: 'spawning_pool', minLevel: 1 }],

  // ── Çağ 2 (Yıldız Sistemi, Lv 10-18) — first cross-world features ────────
  'map.colonize_second_planet':   [{ type: 'level', min: 12 }],   // Hikaye Kitabı 2.3 "İkiz Gezegen"
  'map.asteroid_mining':          [{ type: 'level', min: 16 }],   // 2.3 "Asteroid Kuşağı"

  // ── Çağ 3 (Sektör Genişlemesi, Lv 19-27) — PvP + alliances ──────────────
  // Backend XP_SOURCE_MIN_AGE already pins PvP at age 3; mirror here so the
  // frontend can disable the buttons before submit instead of just on reject.
  'pvp.matchmake':                [{ type: 'age', min: 3 }],
  'pvp.ranked_queue':             [{ type: 'age', min: 3 }],
  'guild.create':                 [{ type: 'age', min: 3 }],
  'guild.join':                   [{ type: 'age', min: 3 }],
  'guild.contribute_research':    [{ type: 'age', min: 3 }, { type: 'building', buildingType: 'research_lab', minLevel: 2 }],

  // ── Çağ 4 (Galaktik Çatışma, Lv 28-36) — alliances + bigger events ──────
  'alliance.war.declare':         [{ type: 'age', min: 4 }],
  'event.sector_war':             [{ type: 'age', min: 4 }],
  'event.elite_tournament':       [{ type: 'age', min: 4 }, { type: 'level', min: 30 }],

  // ── Çağ 5 (Boyutlar Arası, Lv 37-45) — subspace ─────────────────────────
  'map.subspace_rift':            [{ type: 'age', min: 5 }],
  'map.cross_server_pvp':         [{ type: 'age', min: 5 }],

  // ── Çağ 6 (Kozmik Üstünlük, Lv 46-54) — endgame ─────────────────────────
  'event.legend_league':          [{ type: 'age', min: 6 }],
  'event.cosmic_council':         [{ type: 'level', min: 53 }],   // 2.7 "Kozmik Konsey Üyesi"

  // ── Commander tiers ──────────────────────────────────────────────────────
  // Tier-N unlocks track tier-based commander listing in commanders-stub
  // (api/src/meta/commanders-stub.controller.ts). Frontend already filters
  // by `unlocked` from the API; the gate here is for the unlock animation
  // /modal that fires at the transition.
  'commander.tier2':              [{ type: 'age', min: 2 }],
  'commander.tier3':              [{ type: 'age', min: 3 }],
  'commander.tier4':              [{ type: 'age', min: 4 }],
  'commander.tier5':              [{ type: 'age', min: 5 }],

  // ── Shop tabs (story-bible: race-specific shop items per age) ────────────
  'shop.consumables':             [{ type: 'always_on' }],
  'shop.cosmetics':               [{ type: 'level', min: 5 }],
  'shop.premium_skins':           [{ type: 'age', min: 2 }],
  'shop.race_specific_items':     [{ type: 'age', min: 3 }],

  // ── Research tree ────────────────────────────────────────────────────────
  'research.basic':               [{ type: 'building', buildingType: 'research_lab', minLevel: 1 }],
  'research.advanced':            [{ type: 'building', buildingType: 'research_lab', minLevel: 3 }, { type: 'age', min: 2 }],
  'research.subspace':            [{ type: 'age', min: 5 }, { type: 'building', buildingType: 'research_lab', minLevel: 5 }],
};

/**
 * Human-readable label per rule type for the inline subtitle + modal.
 * Frontend can also localise these; this is the fallback when no i18n key
 * is provided.
 */
export function describeRule(rule: GateRule): { short: string; long: string } {
  switch (rule.type) {
    case 'always_on':
      return { short: '', long: 'Her zaman açık' };
    case 'level':
      return { short: `Lv ${rule.min}`, long: `Oyuncu seviyesi en az ${rule.min} olmalı` };
    case 'age':
      return { short: `Çağ ${rule.min}`, long: `Çağ ${rule.min}'e ulaşman gerek` };
    case 'building': {
      const lv = rule.minLevel && rule.minLevel > 1 ? ` Lv ${rule.minLevel}` : '';
      const name = TURKISH_BUILDING_NAMES[rule.buildingType] ?? rule.buildingType;
      return { short: `${name}${lv}`, long: `${name}${lv} gerekli` };
    }
    case 'unit': {
      const count = rule.minCount ?? 1;
      return { short: `${count}× ${rule.unitType}`, long: `${count} adet ${rule.unitType} birimine sahip olman gerek` };
    }
    case 'resource':
      return { short: `${rule.min} ${rule.resource}`, long: `${rule.min} ${rule.resource} gerekli` };
    case 'race':
      return { short: `${rule.race} ırkı`, long: `Sadece ${rule.race} ırkı için açık` };
  }
}

/** Turkish-localised building names — pulled out so describeRule stays short. */
const TURKISH_BUILDING_NAMES: Record<string, string> = {
  command_center:    'Komuta Üssü',
  mineral_extractor: 'Mineral Çıkarıcı',
  mine:              'Maden',
  gas_refinery:      'Gaz Rafinerisi',
  refinery:          'Rafineri',
  solar_plant:       'Güneş Santrali',
  barracks:          'Kışla',
  turret:            'Top Kulesi',
  shield_generator:  'Kalkan Üreteci',
  research_lab:      'Araştırma Lab.',
  academy:           'Akademi',
  factory:           'Fabrika',
  hangar:            'Hangar',
  spawning_pool:     'Üreme Havuzu',
  hatchery:          'Kuluçkahane',
};
