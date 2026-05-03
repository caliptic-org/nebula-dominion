export type RaceKey = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';

export type UnitClass = 'assault' | 'support' | 'tank' | 'sniper' | 'mage' | 'stealth';

export type RowType = 'front' | 'middle' | 'rear';

export interface SlotUnit {
  id: string;
  name: string;
  race: RaceKey;
  level: number;
  portrait: string;
  unitClass: UnitClass;
  power: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface SlotCommander {
  id: string;
  name: string;
  race: RaceKey;
  level: number;
  portrait: string;
  power: number;
  abilities: string[];
  isUnlocked: boolean;
}

export interface FormationSlotData {
  id: string;
  row: RowType;
  index: number;
  unit: SlotUnit | null;
}

export interface CommanderSlotData {
  id: string;
  index: number;
  commander: SlotCommander | null;
}

export interface RaceSynergy {
  race: RaceKey;
  count: number;
  bonuses: SynergyBonus[];
}

export interface SynergyBonus {
  threshold: number;
  description: string;
  active: boolean;
}

export const CLASS_ICONS: Record<UnitClass, string> = {
  assault: '⚔️',
  support: '💊',
  tank:    '🛡️',
  sniper:  '🎯',
  mage:    '✨',
  stealth: '👁️',
};

export const RACE_COLORS: Record<RaceKey, { color: string; glow: string; dim: string; label: string }> = {
  insan:   { color: '#4a9eff', glow: 'rgba(74,158,255,0.4)',  dim: 'rgba(74,158,255,0.12)',  label: 'İnsan'   },
  zerg:    { color: '#44ff44', glow: 'rgba(68,255,68,0.4)',   dim: 'rgba(68,255,68,0.12)',   label: 'Zerg'    },
  otomat:  { color: '#00cfff', glow: 'rgba(0,207,255,0.4)',   dim: 'rgba(0,207,255,0.12)',   label: 'Otomat'  },
  canavar: { color: '#ff6600', glow: 'rgba(255,102,0,0.4)',   dim: 'rgba(255,102,0,0.12)',   label: 'Canavar' },
  seytan:  { color: '#cc00ff', glow: 'rgba(204,0,255,0.4)',   dim: 'rgba(204,0,255,0.12)',   label: 'Şeytan'  },
};

export const SYNERGY_RULES: Record<RaceKey, SynergyBonus[]> = {
  insan:   [
    { threshold: 2, description: '+10% Savunma',     active: false },
    { threshold: 4, description: '+25% Savunma',     active: false },
    { threshold: 6, description: '+20% Saldırı Hızı', active: false },
  ],
  zerg:    [
    { threshold: 2, description: '+15% Saldırı Hızı', active: false },
    { threshold: 4, description: '+30% Hasar',         active: false },
    { threshold: 6, description: 'Kovan Regenerasyon', active: false },
  ],
  otomat:  [
    { threshold: 2, description: '+20% Enerji Kalkan',  active: false },
    { threshold: 4, description: '+15% Hasar Artışı',   active: false },
    { threshold: 6, description: 'Holografik Yedek',    active: false },
  ],
  canavar: [
    { threshold: 2, description: '+20% HP',             active: false },
    { threshold: 4, description: '+25% Saldırı Gücü',   active: false },
    { threshold: 6, description: 'Kadim Öfke (AOE)',     active: false },
  ],
  seytan:  [
    { threshold: 2, description: '+15% Büyü Gücü',      active: false },
    { threshold: 4, description: 'Lanet Bulaşması',      active: false },
    { threshold: 6, description: 'Ruh Çalma Pasif',      active: false },
  ],
};

export interface UnitSlot {
  unitId: string;
  position: number;
}

export interface CommanderSlot {
  commanderId: string;
  position: number;
}

export interface Formation {
  id: string;
  playerId: string;
  name: string;
  unitSlots: UnitSlot[];
  commanderSlots: CommanderSlot[];
  templateId: string | null;
  isLastActive: boolean;
  totalPower: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormationTemplate {
  id: string;
  name: string;
  description: string | null;
  unitSlots: UnitSlot[];
  commanderSlots: CommanderSlot[];
  isActive: boolean;
  createdAt: string;
}

export interface FormationPowerBreakdown {
  unitId: string;
  power: number;
  isCommander: boolean;
}

export interface FormationPowerResult {
  totalPower: number;
  unitCount: number;
  commanderCount: number;
  breakdown: FormationPowerBreakdown[];
}

export interface ListFormationsResponse {
  formations: Formation[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateFormationRequest {
  playerId: string;
  name: string;
  unitSlots: UnitSlot[];
  commanderSlots: CommanderSlot[];
  templateId?: string;
}

export interface UpdateFormationRequest {
  name?: string;
  unitSlots?: UnitSlot[];
  commanderSlots?: CommanderSlot[];
  templateId?: string;
}

export interface FormationPowerRequest {
  playerId: string;
  unitSlots: UnitSlot[];
  commanderSlots: CommanderSlot[];
}

export const FORMATION_LIMITS = {
  MAX_UNIT_SLOTS: 10,
  MAX_COMMANDER_SLOTS: 2,
} as const;
