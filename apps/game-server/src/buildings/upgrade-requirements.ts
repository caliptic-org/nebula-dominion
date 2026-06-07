/**
 * Bina yükseltme prerequisite tablosu — HQ-driven tier progression.
 *
 * RTS standartı: Komuta Üssü (HQ) "tech tier"i belirler, diğer binalar
 * HQ'yu geçemez. HQ'yu yukarı taşımak için yardımcı binaların bir
 * önceki seviyeye gelmiş olması gerekir → oyuncu paralel ilerleme
 * yapmaya zorlanır, tek butona basıp Lv 9'a fırlayamaz.
 *
 * Kurallar:
 *   1. HQ Lv N → N+1: en az 2 ayrı yardımcı bina Lv N'de olmalı.
 *      İlk upgrade (Lv 1 → 2) hariç — Çağ 0 oyuncusu daha bina kurmamış.
 *   2. Diğer bina Lv N → N+1: HQ Lv N+1 olmalı (HQ'yu geçemez).
 *   3. Lv 5+ upgrade'lerinde bilim (science) maliyeti devreye girer —
 *      target_level × 50 bilim. Bu kontrol resources.deduct ile birlikte
 *      yapılır; burada label olarak listelenir.
 *
 * Frontend bu modülü mirror eder (apps/web/src/lib/upgrade-requirements.ts)
 * — backend'in döndüğü {requirements, blockedBy} response shape'i ile
 * birebir aynı string label çıkar.
 */

import { BuildingType, BuildingStatus } from './entities/building.entity';

/**
 * Science charged per target-level on Lv5+ building upgrades.
 *
 * Cycle 17 BAL-02: was 50/level, which made a 6-building HUMAN base
 * to Lv54 cost ~442 500 science — and the ONLY science sources were
 * PvP battle rewards + garrisoned galaxy nodes, silently coupling all
 * mid-game BASE progression to the map/PvP subsystem (~19 capital-node-
 * days of pure uptime). Dropped 10× to 5/level so science is a soft
 * pacing lever, not a hard wall. Paired with a lab science trickle
 * (academy/cyber_core/hatchery sciencePerTick) + a ~500 science starter
 * grant so day-1 Lv5 upgrades are reachable without first winning a PvP
 * battle. MUST stay in sync with the same constant mirrored on the FE
 * (apps/web/src/lib/upgrade-requirements.ts) and the deduction in
 * BuildingsService.upgradeBuilding.
 */
export const SCIENCE_COST_PER_LEVEL = 5;

/** First building level at which science is charged on upgrade. */
export const SCIENCE_GATE_MIN_LEVEL = 5;

export interface UpgradeRequirement {
  /** Internal rule type — frontend uses this to pick an icon. */
  kind: 'building_min_level' | 'hq_min_level' | 'science_min';
  /** Required building type when kind === 'building_min_level'. */
  buildingType?: BuildingType;
  /** Required level (building or HQ). */
  minLevel?: number;
  /** Required science when kind === 'science_min'. */
  minScience?: number;
  /** Human-readable label for toasts + UI chips. */
  label: string;
  /** Computed: does the player currently meet this rule? */
  met: boolean;
}

interface PlayerBuildingState {
  type: BuildingType | string;
  level: number;
  status: BuildingStatus | string;
}

/** A friendly building name table for TR labels. Mirrored on the FE side
 *  so the two paths produce identical strings. */
const BUILDING_LABELS: Partial<Record<string, string>> = {
  command_center:    'Komuta Üssü',
  mineral_extractor: 'Mineral Çıkarıcı',
  gas_refinery:      'Yakıt Rafinerisi',
  solar_plant:       'Reaktör Modülü',
  barracks:          'Kışla',
  academy:           'Bilim Akademisi',
  factory:           'Genetik Lab',
  research_lab:      'Araştırma Lab',
  shield_generator:  'Subspace Anteni',
  turret:            'Savunma Kulesi',
  spawning_pool:     'Mutasyon Çukuru',
  hatchery:          'Genom Tümseği',
  nano_forge:        'Montaj Hattı',
  cyber_core:        'Mantık Matrisi',
  quantum_reactor:   'Cihaz Hazinesi',
  defense_matrix:    'Subspace Çözücü',
  repair_drone_bay:  'Tamir Drone',
};

function nameOf(type: BuildingType | string): string {
  return BUILDING_LABELS[type as string] ?? String(type);
}

/** Active level lookup — destroyed/constructing rows don't count. */
function activeLevelOf(
  buildings: PlayerBuildingState[],
  type: BuildingType | string,
): number {
  let best = 0;
  for (const b of buildings) {
    if (b.type !== type) continue;
    // Constructing/destroyed rows don't satisfy a prerequisite — the
    // upgrade should only count completed work.
    if (b.status !== BuildingStatus.ACTIVE && b.status !== 'active') continue;
    if (b.level > best) best = b.level;
  }
  return best;
}

/** Count distinct support-building types at or above a given level. Used
 *  by the HQ rule which asks for diversity, not just stack count. */
function countDistinctSupportAtLevel(
  buildings: PlayerBuildingState[],
  minLevel: number,
): number {
  const seen = new Set<string>();
  for (const b of buildings) {
    if (b.type === BuildingType.COMMAND_CENTER || b.type === 'command_center') continue;
    if (b.status !== BuildingStatus.ACTIVE && b.status !== 'active') continue;
    if (b.level >= minLevel) seen.add(String(b.type));
  }
  return seen.size;
}

/**
 * Compute the prerequisite list for upgrading `building` to `targetLevel`.
 *
 * Returns every rule (met + unmet) so the frontend can render a checklist
 * — green ticks for done, red dot for blockers. Backend uses
 * `.filter(r => !r.met)` to decide whether to reject the POST.
 *
 * `scienceBalance` is the player's current science wallet; pass 0 if the
 * caller doesn't track it (the science rule will then read as "unmet"
 * which is the safer default).
 */
export function computeUpgradeRequirements(args: {
  building: PlayerBuildingState;
  targetLevel: number;
  ownedBuildings: PlayerBuildingState[];
  scienceBalance: number;
}): UpgradeRequirement[] {
  const { building, targetLevel, ownedBuildings, scienceBalance } = args;
  const out: UpgradeRequirement[] = [];

  const isHq = building.type === BuildingType.COMMAND_CENTER ||
               building.type === 'command_center';

  if (isHq) {
    // Komuta üssünü yukarı taşımak — en az 2 yardımcı bina target-1
    // seviyesinde olmalı. Lv 1 → Lv 2 bedavadır (Çağ 0 oyuncusu).
    if (targetLevel >= 3) {
      const need = 2;
      const supportLevel = targetLevel - 1;
      const have = countDistinctSupportAtLevel(ownedBuildings, supportLevel);
      out.push({
        kind: 'building_min_level',
        minLevel: supportLevel,
        label: `${need} farklı yardımcı bina Lv ${supportLevel}+ (${have}/${need})`,
        met: have >= need,
      });
    }
  } else {
    // Diğer her bina HQ'yu geçemez — HQ ≥ target gerekiyor.
    const hqLevel = activeLevelOf(ownedBuildings, BuildingType.COMMAND_CENTER);
    out.push({
      kind: 'hq_min_level',
      buildingType: BuildingType.COMMAND_CENTER,
      minLevel: targetLevel,
      label: `${nameOf('command_center')} Lv ${targetLevel}`,
      met: hqLevel >= targetLevel,
    });
  }

  // Bilim maliyeti — Lv 5 ve üstü her upgrade için targetLevel × 5
  // (cycle 17 BAL-02: 10× ucuzlatıldı, PvP-only bağımlılığı kırıldı).
  // Lv 1-4 bilim gerektirmez (oyuncu daha akademi açmamış olabilir).
  if (targetLevel >= SCIENCE_GATE_MIN_LEVEL) {
    const scienceCost = targetLevel * SCIENCE_COST_PER_LEVEL;
    out.push({
      kind: 'science_min',
      minScience: scienceCost,
      label: `${scienceCost.toLocaleString()} Bilim`,
      met: scienceBalance >= scienceCost,
    });
  }

  return out;
}

/** True when every requirement is satisfied. Backend uses this as the
 *  reject gate; UI uses it to enable/disable the YÜKSELT button. */
export function canUpgrade(requirements: UpgradeRequirement[]): boolean {
  return requirements.every((r) => r.met);
}

/** Human-readable summary of the blockers — for toast messages. */
export function describeBlockers(requirements: UpgradeRequirement[]): string {
  const unmet = requirements.filter((r) => !r.met);
  if (unmet.length === 0) return '';
  return unmet.map((r) => r.label).join(' · ');
}
