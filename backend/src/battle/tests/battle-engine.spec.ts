import { BattleEngineService } from '../battle-engine.service';
import {
  UnitSnapshot,
  BattleArmy,
  BattleActionType,
  BattleSide,
  BattleStatus,
  TurnAction,
} from '../types/battle.types';

function makeUnit(overrides: Partial<UnitSnapshot> = {}): UnitSnapshot {
  return {
    unitId: 'unit-' + Math.random().toString(36).slice(2),
    name: 'Soldier',
    race: 'human',
    tierLevel: 1,
    attack: 50,
    defense: 30,
    hp: 200,
    maxHp: 200,
    speed: 10,
    isAlive: true,
    ...overrides,
  };
}

describe('BattleEngineService', () => {
  let engine: BattleEngineService;

  beforeEach(() => {
    engine = new BattleEngineService();
  });

  describe('calculateDamage', () => {
    it('returns at least 1 damage', () => {
      const attacker = makeUnit({ attack: 1 });
      const defender = makeUnit({ defense: 9999 });
      const result = engine.calculateDamage(attacker, defender);
      expect(result.finalDamage).toBeGreaterThanOrEqual(1);
    });

    it('high attack vs low defense yields more damage', () => {
      const strong = makeUnit({ attack: 200, defense: 0 });
      const weak = makeUnit({ attack: 10, defense: 0 });
      const target = makeUnit({ defense: 0 });
      const strongResult = engine.calculateDamage(strong, target);
      const weakResult = engine.calculateDamage(weak, target);
      expect(strongResult.baseDamage).toBeGreaterThan(weakResult.baseDamage);
    });

    it('defense reduces damage but is capped at 75%', () => {
      const attacker = makeUnit({ attack: 100 });
      const highDefender = makeUnit({ defense: 99999 });
      const result = engine.calculateDamage(attacker, highDefender);
      // At 75% cap, minimum damage = 100 * 0.25 = 25
      expect(result.baseDamage).toBeGreaterThanOrEqual(25);
    });

    it('critical hit applies 1.75x multiplier', () => {
      const attacker = makeUnit({ attack: 100 });
      const defender = makeUnit({ defense: 0 });
      // Simulate a crit by mocking Math.random
      jest.spyOn(Math, 'random').mockReturnValue(0.01); // always below crit chance
      const result = engine.calculateDamage(attacker, defender);
      expect(result.criticalHit).toBe(true);
      expect(result.finalDamage).toBeGreaterThan(result.baseDamage);
      jest.restoreAllMocks();
    });
  });

  describe('executeTurn', () => {
    it('throws on wrong player turn', () => {
      const attackerUnit = makeUnit({ unitId: 'a-unit' });
      const defenderUnit = makeUnit({ unitId: 'd-unit' });
      const attackerArmy: BattleArmy = { playerId: 'player-a', units: [attackerUnit] };
      const defenderArmy: BattleArmy = { playerId: 'player-b', units: [defenderUnit] };
      const state = engine.buildBattleState('battle-1', attackerArmy, defenderArmy);

      const action: TurnAction = {
        battleId: 'battle-1',
        playerId: 'player-b', // wrong player
        actionType: BattleActionType.ATTACK,
        attackerUnitId: 'a-unit',
        targetUnitId: 'd-unit',
      };

      expect(() => engine.executeTurn(state, action)).toThrow('Anti-cheat: not your turn');
    });

    it('reduces defender HP after attack', () => {
      const attackerUnit = makeUnit({ unitId: 'a-unit', attack: 100 });
      const defenderUnit = makeUnit({ unitId: 'd-unit', defense: 0, hp: 500, maxHp: 500 });
      const attackerArmy: BattleArmy = { playerId: 'player-a', units: [attackerUnit] };
      const defenderArmy: BattleArmy = { playerId: 'player-b', units: [defenderUnit] };
      const state = engine.buildBattleState('battle-1', attackerArmy, defenderArmy);

      jest.spyOn(Math, 'random').mockReturnValue(0.5); // no crit
      const result = engine.executeTurn(state, {
        battleId: 'battle-1',
        playerId: 'player-a',
        actionType: BattleActionType.ATTACK,
        attackerUnitId: 'a-unit',
        targetUnitId: 'd-unit',
      });

      expect(result.remainingHp).toBeLessThan(500);
      expect(result.battleEnded).toBe(false);
      jest.restoreAllMocks();
    });

    it('marks battleEnded when last defender unit dies', () => {
      const attackerUnit = makeUnit({ unitId: 'a-unit', attack: 9999 });
      const defenderUnit = makeUnit({ unitId: 'd-unit', defense: 0, hp: 1, maxHp: 1 });
      const attackerArmy: BattleArmy = { playerId: 'player-a', units: [attackerUnit] };
      const defenderArmy: BattleArmy = { playerId: 'player-b', units: [defenderUnit] };
      const state = engine.buildBattleState('battle-1', attackerArmy, defenderArmy);

      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const result = engine.executeTurn(state, {
        battleId: 'battle-1',
        playerId: 'player-a',
        actionType: BattleActionType.ATTACK,
        attackerUnitId: 'a-unit',
        targetUnitId: 'd-unit',
      });

      expect(result.battleEnded).toBe(true);
      expect(result.winner).toBe(BattleSide.ATTACKER);
      jest.restoreAllMocks();
    });

    it('surrender sets battleEnded with opposing side as winner', () => {
      const attackerUnit = makeUnit({ unitId: 'a-unit' });
      const defenderUnit = makeUnit({ unitId: 'd-unit' });
      const attackerArmy: BattleArmy = { playerId: 'player-a', units: [attackerUnit] };
      const defenderArmy: BattleArmy = { playerId: 'player-b', units: [defenderUnit] };
      const state = engine.buildBattleState('battle-1', attackerArmy, defenderArmy);

      const result = engine.executeTurn(state, {
        battleId: 'battle-1',
        playerId: 'player-a',
        actionType: BattleActionType.SURRENDER,
        attackerUnitId: 'a-unit',
        targetUnitId: '',
      });

      expect(result.battleEnded).toBe(true);
      expect(result.winner).toBe(BattleSide.DEFENDER);
    });
  });

  describe('computeStateHash', () => {
    it('produces consistent hash for same inputs', () => {
      const attackerArmy: BattleArmy = { playerId: 'player-a', units: [] };
      const defenderArmy: BattleArmy = { playerId: 'player-b', units: [] };
      const action: TurnAction = {
        battleId: 'b1',
        playerId: 'player-a',
        actionType: BattleActionType.ATTACK,
        attackerUnitId: 'u1',
        targetUnitId: 'u2',
      };
      const damage = { baseDamage: 10, criticalHit: false, critMultiplier: 1, finalDamage: 10, blocked: 0 };

      const h1 = engine.computeStateHash('b1', 1, action, damage, attackerArmy, defenderArmy);
      const h2 = engine.computeStateHash('b1', 1, action, damage, attackerArmy, defenderArmy);
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
    });

    it('produces different hash for different turn numbers', () => {
      const attackerArmy: BattleArmy = { playerId: 'player-a', units: [] };
      const defenderArmy: BattleArmy = { playerId: 'player-b', units: [] };
      const action: TurnAction = {
        battleId: 'b1',
        playerId: 'player-a',
        actionType: BattleActionType.ATTACK,
        attackerUnitId: 'u1',
        targetUnitId: 'u2',
      };
      const damage = { baseDamage: 10, criticalHit: false, critMultiplier: 1, finalDamage: 10, blocked: 0 };

      const h1 = engine.computeStateHash('b1', 1, action, damage, attackerArmy, defenderArmy);
      const h2 = engine.computeStateHash('b1', 2, action, damage, attackerArmy, defenderArmy);
      expect(h1).not.toBe(h2);
    });
  });

  describe('sortByInitiative', () => {
    it('sorts by speed descending', () => {
      const slow = makeUnit({ speed: 5, name: 'Slow' });
      const fast = makeUnit({ speed: 15, name: 'Fast' });
      const mid = makeUnit({ speed: 10, name: 'Mid' });
      const sorted = engine.sortByInitiative([slow, mid, fast]);
      expect(sorted[0].speed).toBe(15);
      expect(sorted[1].speed).toBe(10);
      expect(sorted[2].speed).toBe(5);
    });

    it('excludes dead units', () => {
      const alive = makeUnit({ isAlive: true });
      const dead = makeUnit({ isAlive: false });
      const sorted = engine.sortByInitiative([alive, dead]);
      expect(sorted).toHaveLength(1);
    });
  });
});
