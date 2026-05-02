export enum BattleStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum BattleActionType {
  ATTACK = 'attack',
  DEFEND = 'defend',
  SURRENDER = 'surrender',
}

export enum BattleSide {
  ATTACKER = 'attacker',
  DEFENDER = 'defender',
}

export interface UnitSnapshot {
  unitId: string;
  name: string;
  race: string;
  tierLevel: number;
  attack: number;
  defense: number;
  hp: number;
  maxHp: number;
  speed: number;
  isAlive: boolean;
}

export interface BattleArmy {
  playerId: string;
  units: UnitSnapshot[];
}

export interface TurnAction {
  battleId: string;
  playerId: string;
  actionType: BattleActionType;
  attackerUnitId: string;
  targetUnitId: string;
}

export interface DamageResult {
  baseDamage: number;
  criticalHit: boolean;
  critMultiplier: number;
  finalDamage: number;
  blocked: number;
}

export interface TurnResult {
  turnNumber: number;
  attackerUnitId: string;
  attackerUnitName: string;
  defenderUnitId: string;
  defenderUnitName: string;
  damageResult: DamageResult;
  remainingHp: number;
  unitKilled: boolean;
  battleEnded: boolean;
  winner?: BattleSide;
  stateHash: string;
}

export interface BattleState {
  battleId: string;
  currentTurn: number;
  attackerArmy: BattleArmy;
  defenderArmy: BattleArmy;
  currentTurnSide: BattleSide;
  status: BattleStatus;
}

export interface ReplayFrame {
  turn: number;
  action: TurnAction;
  result: TurnResult;
  attackerArmyState: UnitSnapshot[];
  defenderArmyState: UnitSnapshot[];
  timestamp: string;
}

export interface BattleReplay {
  battleId: string;
  attackerId: string;
  defenderId: string;
  winnerId: string | null;
  startedAt: string;
  endedAt: string;
  totalTurns: number;
  frames: ReplayFrame[];
  engineVersion: string;
}
