import { UnitType, UNIT_CONFIGS } from '../units/constants/race-configs.constants';

export interface UnitMeta {
  name: string;
  emoji: string;
}

const UNIT_DISPLAY: Record<string, UnitMeta> = {
  marine:     { name: 'Marine',     emoji: '🪖' },
  medic:      { name: 'Medic',      emoji: '💊' },
  siege_tank: { name: 'Siege Tank', emoji: '🛡️' },
  ghost:      { name: 'Ghost',      emoji: '👻' },
  zergling:   { name: 'Zergling',   emoji: '🦟' },
  hydralisk:  { name: 'Hydralisk',  emoji: '🐍' },
  ultralisk:  { name: 'Ultralisk',  emoji: '🦖' },
  queen:      { name: 'Queen',      emoji: '👑' },
};

const DEFAULT_TRAIN_TIME_SECONDS = 30;
const LEVEL_DURATION_MULTIPLIER_PER_LEVEL = 0.2;

export function getUnitMeta(unitType: string): UnitMeta {
  const known = UNIT_DISPLAY[unitType];
  if (known) return known;
  return {
    name: unitType
      .split('_')
      .map((s) => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)))
      .join(' '),
    emoji: '⚔️',
  };
}

export function getBaseTrainTimeSeconds(unitType: string): number {
  const config = UNIT_CONFIGS[unitType as UnitType];
  return config?.trainTimeSeconds ?? DEFAULT_TRAIN_TIME_SECONDS;
}

/**
 * Total production duration in seconds. Higher levels cost more time:
 * `base × (1 + (level - 1) × 0.2)`. Level 1 = base, level 5 = +80%.
 */
export function computeTotalDurationSeconds(unitType: string, level: number): number {
  const base = getBaseTrainTimeSeconds(unitType);
  const multiplier = 1 + (level - 1) * LEVEL_DURATION_MULTIPLIER_PER_LEVEL;
  return Math.max(1, Math.round(base * multiplier));
}

export function isKnownUnitType(unitType: string): unitType is UnitType {
  return unitType in UNIT_CONFIGS;
}
