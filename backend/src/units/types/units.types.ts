export enum UnitRace {
  HUMAN = 'human',
  ZERG = 'zerg',
  DROID = 'droid',
  CREATURE = 'creature',
  DEMON = 'demon',
}

export enum MergeSessionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
}

export interface MergePreview {
  resultRace: UnitRace;
  resultName: string;
  resultTierLevel: number;
  attack: number;
  defense: number;
  hp: number;
  maxHp: number;
  speed: number;
  abilities: string[];
  mutationRuleId: string | null;
  mutationRuleName: string | null;
  isEvolvedSameRace: boolean;
}

export interface MergeSession {
  sessionId: string;
  playerId: string;
  unit1Id: string;
  unit2Id: string;
  preview: MergePreview;
  status: MergeSessionStatus;
  expiresAt: string;
  createdAt: string;
}

export interface MutationTreeEntry {
  ruleId: string;
  sourceRace1: UnitRace;
  sourceRace2: UnitRace;
  minTierLevel: number;
  resultRace: UnitRace;
  resultNameTemplate: string;
  attackMultiplier: number;
  defenseMultiplier: number;
  hpMultiplier: number;
  speedMultiplier: number;
  bonusAbilities: string[];
  description: string;
}
