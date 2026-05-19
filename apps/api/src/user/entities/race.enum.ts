export enum Race {
  HUMAN = 'human',
  ZERG = 'zerg',
  AUTOMATON = 'automaton',
  BEAST = 'beast',
  DEMON = 'demon',
}

export const RACE_VALUES: Race[] = [
  Race.HUMAN,
  Race.ZERG,
  Race.AUTOMATON,
  Race.BEAST,
  Race.DEMON,
];

export const RACE_TIER9_NAMES: Record<Race, string> = {
  [Race.HUMAN]: 'Yutucu Yıldız Varisi',
  [Race.ZERG]: 'Yutucu Kraliçe',
  [Race.AUTOMATON]: 'Sonsuz Mantık Demiurge',
  [Race.BEAST]: 'Primordial Canavar Tanrı',
  [Race.DEMON]: 'Sonsuz Karanlık Hükümdar',
};
