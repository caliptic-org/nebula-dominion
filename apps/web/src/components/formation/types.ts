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

export const DEMO_AVAILABLE_UNITS: SlotUnit[] = [
  { id: 'u1',  name: 'Voss',          race: 'insan',   level: 5, portrait: '/assets/characters/insan/voss.png',             unitClass: 'assault', power: 1840, hp: 450,  attack: 95,  defense: 72, speed: 55 },
  { id: 'u2',  name: 'Chen',          race: 'insan',   level: 3, portrait: '/assets/characters/insan/chen.png',             unitClass: 'support', power: 1120, hp: 310,  attack: 42,  defense: 55, speed: 50 },
  { id: 'u3',  name: 'Reyes',         race: 'insan',   level: 2, portrait: '/assets/characters/insan/reyes.png',            unitClass: 'sniper',  power: 980,  hp: 270,  attack: 88,  defense: 30, speed: 48 },
  { id: 'u4',  name: 'Kovacs',        race: 'insan',   level: 4, portrait: '/assets/characters/insan/kovacs.png',           unitClass: 'tank',    power: 1650, hp: 620,  attack: 55,  defense: 90, speed: 28 },
  { id: 'u5',  name: 'Vex Thara',     race: 'zerg',    level: 6, portrait: '/assets/characters/zerg/vex_thara.png',         unitClass: 'mage',    power: 2200, hp: 390,  attack: 110, defense: 40, speed: 80 },
  { id: 'u6',  name: 'Morgath',       race: 'zerg',    level: 4, portrait: '/assets/characters/zerg/morgath.png',           unitClass: 'assault', power: 1780, hp: 440,  attack: 105, defense: 45, speed: 75 },
  { id: 'u7',  name: 'Threnix',       race: 'zerg',    level: 3, portrait: '/assets/characters/zerg/threnix.png',           unitClass: 'stealth', power: 1340, hp: 320,  attack: 88,  defense: 32, speed: 85 },
  { id: 'u8',  name: 'Demiurge Prime',race: 'otomat',  level: 7, portrait: '/assets/characters/otomat/demiurge_prime.png',  unitClass: 'tank',    power: 2650, hp: 750,  attack: 80,  defense: 120, speed: 35 },
  { id: 'u9',  name: 'Aurelius',      race: 'otomat',  level: 4, portrait: '/assets/characters/otomat/aurelius.png',        unitClass: 'sniper',  power: 1520, hp: 360,  attack: 98,  defense: 65, speed: 42 },
  { id: 'u10', name: 'Khorvash',      race: 'canavar', level: 6, portrait: '/assets/characters/canavar/khorvash.png',       unitClass: 'assault', power: 2400, hp: 680,  attack: 130, defense: 70, speed: 38 },
  { id: 'u11', name: 'Ravenna',       race: 'canavar', level: 4, portrait: '/assets/characters/canavar/ravenna.png',        unitClass: 'mage',    power: 1720, hp: 400,  attack: 115, defense: 42, speed: 45 },
  { id: 'u12', name: 'Malphas',       race: 'seytan',  level: 8, portrait: '/assets/characters/seytan/malphas.png',         unitClass: 'mage',    power: 2900, hp: 420,  attack: 145, defense: 55, speed: 62 },
  { id: 'u13', name: 'Lilithra',      race: 'seytan',  level: 5, portrait: '/assets/characters/seytan/lilithra.png',        unitClass: 'stealth', power: 1960, hp: 370,  attack: 122, defense: 38, speed: 78 },
];

export const DEMO_AVAILABLE_COMMANDERS: SlotCommander[] = [
  { id: 'c1', name: 'Voss',          race: 'insan',   level: 5, portrait: '/assets/characters/insan/voss.png',            power: 3200, abilities: ['Stimpack', 'Zırh Takviyesi', 'Nişancı Modu'],   isUnlocked: true },
  { id: 'c2', name: 'Demiurge Prime',race: 'otomat',  level: 7, portrait: '/assets/characters/otomat/demiurge_prime.png', power: 4800, abilities: ['Enerji Alanı', 'Holografik Yansıma'],            isUnlocked: true },
  { id: 'c3', name: 'Malphas',       race: 'seytan',  level: 8, portrait: '/assets/characters/seytan/malphas.png',        power: 5600, abilities: ['Lanet Fırtınası', 'Ruh Çalma', 'Karanlık Portal'], isUnlocked: true },
  { id: 'c4', name: 'Khorvash',      race: 'canavar', level: 6, portrait: '/assets/characters/canavar/khorvash.png',      power: 4100, abilities: ['Ateş Nefesi', 'Yıkım Darbesi'],                   isUnlocked: true },
  { id: 'c5', name: 'Vex Thara',     race: 'zerg',    level: 6, portrait: '/assets/characters/zerg/vex_thara.png',        power: 3900, abilities: ['Kovan Sürüsü', 'Mutasyon Çağrısı'],               isUnlocked: true },
];

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
