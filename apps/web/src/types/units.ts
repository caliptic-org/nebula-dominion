export enum Race {
  HUMAN = 'human',
  ZERG = 'zerg',
  AUTOMATON = 'automaton',
}

export enum UnitType {
  MARINE = 'marine',
  MEDIC = 'medic',
  SIEGE_TANK = 'siege_tank',
  GHOST = 'ghost',
  ZERGLING = 'zergling',
  HYDRALISK = 'hydralisk',
  ULTRALISK = 'ultralisk',
  QUEEN = 'queen',
}

export interface UnitCost {
  mineral: number;
  gas: number;
  energy: number;
}

export interface UnitConfig {
  type: UnitType;
  race: Race;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  cost: UnitCost;
  trainTimeSeconds: number;
  abilities: string[];
  description: string;
}

export interface PlayerUnit {
  id: string;
  type: UnitType;
  race: Race;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  positionX: number;
  positionY: number;
  abilities: string[];
  isAlive: boolean;
}

export interface RaceDescription {
  name: string;
  subtitle: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  stats: {
    attack: number;   // 0-100 relative
    defense: number;  // 0-100 relative
    speed: number;    // 0-100 relative
    hp: number;       // 0-100 relative
  };
}

export const RACE_DESCRIPTIONS: Record<Race, RaceDescription> = {
  [Race.HUMAN]: {
    name: 'İnsan',
    subtitle: 'Dengeli & Teknoloji',
    description:
      'İnsan ırkı dengeli birimler ve ileri teknoloji ile savaşır. Yüksek savunma ve HP bonusları sağlar. Siege Tank ve Ghost gibi özel birimler düşmanlara büyük hasar verir.',
    color: '#4a9eff',
    bgColor: 'rgba(74, 158, 255, 0.08)',
    icon: '⚔️',
    stats: { attack: 60, defense: 80, speed: 55, hp: 75 },
  },
  [Race.ZERG]: {
    name: 'Zerg',
    subtitle: 'Kalabalık & Hız',
    description:
      'Zerg ırkı yüksek hızlı, ucuz birimlerden oluşan büyük orduları tercih eder. Saldırı bonusu ve hız avantajı ile düşmanı ezer. Ultralisk gibi devasa birimler yıkım saçar.',
    color: '#44dd44',
    bgColor: 'rgba(68, 221, 68, 0.08)',
    icon: '🦟',
    stats: { attack: 85, defense: 45, speed: 90, hp: 55 },
  },
  [Race.AUTOMATON]: {
    name: 'Automaton',
    subtitle: 'Zırh & Mekanik',
    description:
      'Automaton ırkı yüksek zırhlı mekanik birimler kullanır. Güçlü savunma ve saldırı kapasitesiyle dayanıklıdır, ancak üretim süresi daha uzundur.',
    color: '#ff8800',
    bgColor: 'rgba(255, 136, 0, 0.08)',
    icon: '🤖',
    stats: { attack: 75, defense: 90, speed: 40, hp: 70 },
  },
};

export const UNIT_DISPLAY_NAMES: Record<UnitType, string> = {
  [UnitType.MARINE]: 'Denizci',
  [UnitType.MEDIC]: 'Sağlıkçı',
  [UnitType.SIEGE_TANK]: 'Kuşatma Tankı',
  [UnitType.GHOST]: 'Hayalet',
  [UnitType.ZERGLING]: 'Zergling',
  [UnitType.HYDRALISK]: 'Hidralize',
  [UnitType.ULTRALISK]: 'Ultralisk',
  [UnitType.QUEEN]: 'Kraliçe',
};

/** Demo units for each race (for UI previews) */
export const DEMO_UNITS: Record<Race, PlayerUnit[]> = {
  [Race.HUMAN]: [
    {
      id: 'h1',
      type: UnitType.MARINE,
      race: Race.HUMAN,
      hp: 45,
      maxHp: 45,
      attack: 10,
      defense: 7,
      speed: 3,
      positionX: 2,
      positionY: 3,
      abilities: ['stimpack'],
      isAlive: true,
    },
    {
      id: 'h2',
      type: UnitType.MEDIC,
      race: Race.HUMAN,
      hp: 30,
      maxHp: 30,
      attack: 4,
      defense: 5,
      speed: 3,
      positionX: 3,
      positionY: 5,
      abilities: ['heal', 'restoration'],
      isAlive: true,
    },
    {
      id: 'h3',
      type: UnitType.SIEGE_TANK,
      race: Race.HUMAN,
      hp: 150,
      maxHp: 150,
      attack: 35,
      defense: 14,
      speed: 1,
      positionX: 5,
      positionY: 2,
      abilities: ['siege_mode', 'tank_fire'],
      isAlive: true,
    },
  ],
  [Race.ZERG]: [
    {
      id: 'z1',
      type: UnitType.ZERGLING,
      race: Race.ZERG,
      hp: 32,
      maxHp: 35,
      attack: 9,
      defense: 3,
      speed: 6,
      positionX: 1,
      positionY: 1,
      abilities: ['adrenal_glands'],
      isAlive: true,
    },
    {
      id: 'z2',
      type: UnitType.HYDRALISK,
      race: Race.ZERG,
      hp: 72,
      maxHp: 80,
      attack: 16,
      defense: 4,
      speed: 4,
      positionX: 4,
      positionY: 6,
      abilities: ['needle_spine', 'ranged_attack'],
      isAlive: true,
    },
    {
      id: 'z3',
      type: UnitType.QUEEN,
      race: Race.ZERG,
      hp: 175,
      maxHp: 175,
      attack: 14,
      defense: 6,
      speed: 3,
      positionX: 7,
      positionY: 3,
      abilities: ['spawn_larvae', 'transfusion'],
      isAlive: true,
    },
  ],
  [Race.AUTOMATON]: [],
};
