import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  UnitSnapshot,
  BattleArmy,
  DamageResult,
  TurnResult,
  BattleState,
  BattleSide,
  BattleStatus,
  TurnAction,
  BattleActionType,
} from './types/battle.types';

@Injectable()
export class BattleEngineService {
  private readonly logger = new Logger(BattleEngineService.name);
  private readonly CRIT_CHANCE = 0.15;
  private readonly CRIT_MULTIPLIER = 1.75;
  private readonly DEFENSE_REDUCTION_CAP = 0.75;
  private readonly ENGINE_VERSION = '1.0.0';

  getEngineVersion(): string {
    return this.ENGINE_VERSION;
  }

  /**
   * Server-side damage calculation — clients never control this.
   * Formula: base = attacker.attack * (1 - defense_reduction)
   * defense_reduction = min(defender.defense / (defender.defense + 100), 0.75)
   */
  calculateDamage(attacker: UnitSnapshot, defender: UnitSnapshot): DamageResult {
    const defenseReduction = Math.min(
      defender.defense / (defender.defense + 100),
      this.DEFENSE_REDUCTION_CAP,
    );
    const baseDamage = Math.max(1, Math.round(attacker.attack * (1 - defenseReduction)));
    const criticalHit = Math.random() < this.CRIT_CHANCE;
    const critMultiplier = criticalHit ? this.CRIT_MULTIPLIER : 1.0;
    const rawFinal = Math.round(baseDamage * critMultiplier);
    const blocked = rawFinal - baseDamage;
    const finalDamage = rawFinal;

    return { baseDamage, criticalHit, critMultiplier, finalDamage, blocked };
  }

  /**
   * Compute initiative order: units with higher speed attack first.
   * Ties broken by unit id for determinism.
   */
  sortByInitiative(units: UnitSnapshot[]): UnitSnapshot[] {
    return [...units]
      .filter((u) => u.isAlive)
      .sort((a, b) => {
        if (b.speed !== a.speed) return b.speed - a.speed;
        return a.unitId.localeCompare(b.unitId);
      });
  }

  /**
   * Select the best target: alive unit with lowest HP first.
   * Anti-cheat: selection is server-driven when auto is requested.
   */
  selectTarget(army: BattleArmy): UnitSnapshot | null {
    const alive = army.units.filter((u) => u.isAlive);
    if (alive.length === 0) return null;
    return alive.reduce((prev, cur) => (cur.hp < prev.hp ? cur : prev));
  }

  executeTurn(
    state: BattleState,
    action: TurnAction,
  ): TurnResult {
    const isAttackerTurn = state.currentTurnSide === BattleSide.ATTACKER;
    const actingArmy = isAttackerTurn ? state.attackerArmy : state.defenderArmy;
    const opposingArmy = isAttackerTurn ? state.defenderArmy : state.attackerArmy;

    // Anti-cheat: verify it's the correct player's turn
    if (action.playerId !== actingArmy.playerId) {
      throw new Error(`Anti-cheat: not your turn. Expected ${actingArmy.playerId}`);
    }

    const attackerUnit = actingArmy.units.find(
      (u) => u.unitId === action.attackerUnitId && u.isAlive,
    );
    if (!attackerUnit) {
      throw new Error(`Anti-cheat: attacker unit ${action.attackerUnitId} not found or dead`);
    }

    let defenderUnit: UnitSnapshot | null;
    if (action.actionType === BattleActionType.SURRENDER) {
      return this.buildSurrenderResult(state, action, isAttackerTurn);
    }

    if (action.targetUnitId) {
      defenderUnit = opposingArmy.units.find(
        (u) => u.unitId === action.targetUnitId && u.isAlive,
      ) || null;
    } else {
      defenderUnit = this.selectTarget(opposingArmy);
    }

    if (!defenderUnit) {
      throw new Error('No valid target found');
    }

    // All damage computation happens server-side
    const damageResult = this.calculateDamage(attackerUnit, defenderUnit);

    defenderUnit.hp = Math.max(0, defenderUnit.hp - damageResult.finalDamage);
    defenderUnit.isAlive = defenderUnit.hp > 0;

    const aliveInOpposing = opposingArmy.units.filter((u) => u.isAlive).length;
    const battleEnded = aliveInOpposing === 0;
    let winner: BattleSide | undefined;
    if (battleEnded) {
      winner = isAttackerTurn ? BattleSide.ATTACKER : BattleSide.DEFENDER;
    }

    const stateHash = this.computeStateHash(
      state.battleId,
      state.currentTurn,
      action,
      damageResult,
      state.attackerArmy,
      state.defenderArmy,
    );

    return {
      turnNumber: state.currentTurn,
      attackerUnitId: attackerUnit.unitId,
      attackerUnitName: attackerUnit.name,
      defenderUnitId: defenderUnit.unitId,
      defenderUnitName: defenderUnit.name,
      damageResult,
      remainingHp: defenderUnit.hp,
      unitKilled: !defenderUnit.isAlive,
      battleEnded,
      winner,
      stateHash,
    };
  }

  private buildSurrenderResult(
    state: BattleState,
    action: TurnAction,
    isAttackerTurn: boolean,
  ): TurnResult {
    const winner = isAttackerTurn ? BattleSide.DEFENDER : BattleSide.ATTACKER;
    const stateHash = this.computeStateHash(
      state.battleId,
      state.currentTurn,
      action,
      { baseDamage: 0, criticalHit: false, critMultiplier: 1, finalDamage: 0, blocked: 0 },
      state.attackerArmy,
      state.defenderArmy,
    );
    return {
      turnNumber: state.currentTurn,
      attackerUnitId: action.attackerUnitId,
      attackerUnitName: 'surrender',
      defenderUnitId: '',
      defenderUnitName: '',
      damageResult: { baseDamage: 0, criticalHit: false, critMultiplier: 1, finalDamage: 0, blocked: 0 },
      remainingHp: 0,
      unitKilled: false,
      battleEnded: true,
      winner,
      stateHash,
    };
  }

  advanceTurn(state: BattleState): void {
    state.currentTurn += 1;
    state.currentTurnSide =
      state.currentTurnSide === BattleSide.ATTACKER
        ? BattleSide.DEFENDER
        : BattleSide.ATTACKER;
  }

  /**
   * Deterministic hash over battle state for anti-cheat replay integrity.
   * Stored in battle_logs.state_hash and verified during replay validation.
   */
  computeStateHash(
    battleId: string,
    turn: number,
    action: TurnAction,
    damage: DamageResult,
    attackerArmy: BattleArmy,
    defenderArmy: BattleArmy,
  ): string {
    const payload = JSON.stringify({
      battleId,
      turn,
      action: {
        playerId: action.playerId,
        actionType: action.actionType,
        attackerUnitId: action.attackerUnitId,
        targetUnitId: action.targetUnitId,
      },
      damage: {
        finalDamage: damage.finalDamage,
        criticalHit: damage.criticalHit,
      },
      attackerAlive: attackerArmy.units.filter((u) => u.isAlive).map((u) => ({ id: u.unitId, hp: u.hp })),
      defenderAlive: defenderArmy.units.filter((u) => u.isAlive).map((u) => ({ id: u.unitId, hp: u.hp })),
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  buildBattleState(
    battleId: string,
    attackerArmy: BattleArmy,
    defenderArmy: BattleArmy,
    currentTurn = 0,
    currentTurnSide: BattleSide = BattleSide.ATTACKER,
    status: BattleStatus = BattleStatus.IN_PROGRESS,
  ): BattleState {
    return { battleId, currentTurn, attackerArmy, defenderArmy, currentTurnSide, status };
  }

  isArmyDefeated(army: BattleArmy): boolean {
    return army.units.every((u) => !u.isAlive);
  }
}
