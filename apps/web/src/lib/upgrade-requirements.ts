/**
 * Frontend mirror of apps/game-server/src/buildings/upgrade-requirements.ts.
 *
 * Identical logic so the UI can show requirements live (checklist with
 * green ticks + red dots) before the player hits POST. Backend re-runs
 * the check to enforce; this is purely a UX hint to keep the player from
 * tapping a doomed button.
 *
 * MUST stay in sync with the backend file — same rules, same label
 * strings, same target-level math. When changing one, change both.
 */

export type BuildingType = string;

/**
 * Science charged per target-level on Lv5+ upgrades. Cycle 17 BAL-02:
 * dropped 10× (50 → 5) to decouple base progression from PvP-only science
 * sourcing. MUST match SCIENCE_COST_PER_LEVEL / SCIENCE_GATE_MIN_LEVEL in
 * apps/game-server/src/buildings/upgrade-requirements.ts.
 */
export const SCIENCE_COST_PER_LEVEL = 5;
export const SCIENCE_GATE_MIN_LEVEL = 5;

export interface UpgradeRequirement {
  kind: 'building_min_level' | 'hq_min_level' | 'science_min';
  buildingType?: BuildingType;
  minLevel?: number;
  minScience?: number;
  label: string;
  met: boolean;
}

export interface PlayerBuildingLite {
  type: BuildingType;
  level: number;
  status: string;
}

const BUILDING_LABELS: Record<string, string> = {
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

function activeLevelOf(buildings: PlayerBuildingLite[], type: string): number {
  let best = 0;
  for (const b of buildings) {
    if (b.type !== type) continue;
    if (b.status !== 'active') continue;
    if (b.level > best) best = b.level;
  }
  return best;
}

function countDistinctSupportAtLevel(
  buildings: PlayerBuildingLite[],
  minLevel: number,
): number {
  const seen = new Set<string>();
  for (const b of buildings) {
    if (b.type === 'command_center') continue;
    if (b.status !== 'active') continue;
    if (b.level >= minLevel) seen.add(b.type);
  }
  return seen.size;
}

export function computeUpgradeRequirements(args: {
  building: PlayerBuildingLite;
  targetLevel: number;
  ownedBuildings: PlayerBuildingLite[];
  scienceBalance: number;
}): UpgradeRequirement[] {
  const { building, targetLevel, ownedBuildings, scienceBalance } = args;
  const out: UpgradeRequirement[] = [];
  const isHq = building.type === 'command_center';

  if (isHq) {
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
    const hqLevel = activeLevelOf(ownedBuildings, 'command_center');
    out.push({
      kind: 'hq_min_level',
      buildingType: 'command_center',
      minLevel: targetLevel,
      label: `${BUILDING_LABELS.command_center} Lv ${targetLevel}`,
      met: hqLevel >= targetLevel,
    });
  }

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

export function canUpgrade(requirements: UpgradeRequirement[]): boolean {
  return requirements.every((r) => r.met);
}
