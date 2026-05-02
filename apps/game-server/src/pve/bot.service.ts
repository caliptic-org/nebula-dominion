import { Injectable, Logger } from '@nestjs/common';
import { GameRoom, UnitState, TurnPhase } from '../game/room.service';
import { ActionType, GameActionDto } from '../game/dto/game-action.dto';

const GRID_WIDTH = 8;
const GRID_HEIGHT = 6;
const MANA_ABILITY_THRESHOLD = 30;

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isOccupied(pos: { x: number; y: number }, units: UnitState[], exclude?: string): boolean {
  return units.some((u) => u.id !== exclude && u.position.x === pos.x && u.position.y === pos.y);
}

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  /**
   * Produces a sequence of actions for the bot to take on its turn.
   * Returns one action at a time — the gateway calls this repeatedly until END_TURN.
   */
  decideAction(room: GameRoom, botId: string, sequenceBase: number): GameActionDto | null {
    const botPlayer = room.players[botId];
    if (!botPlayer) return null;

    const humanId = Object.keys(room.players).find((id) => id !== botId)!;
    const humanPlayer = room.players[humanId];

    if (room.phase === TurnPhase.DEPLOY) {
      return { roomId: room.id, type: ActionType.END_TURN, sequenceNumber: sequenceBase };
    }

    // Find a bot unit that hasn't acted yet
    const actingUnit = botPlayer.units.find((u) => !u.actionUsed);
    if (!actingUnit) {
      // All units have acted — end turn
      return { roomId: room.id, type: ActionType.END_TURN, sequenceNumber: sequenceBase };
    }

    // Try to use ability first if we have mana and the unit is healthy
    if (botPlayer.mana >= MANA_ABILITY_THRESHOLD && actingUnit.hp > actingUnit.maxHp * 0.5) {
      return {
        roomId: room.id,
        type: ActionType.USE_ABILITY,
        sequenceNumber: sequenceBase,
        payload: { unitId: actingUnit.id },
      };
    }

    // Find the closest enemy unit
    const target = this.findClosestEnemy(actingUnit, humanPlayer.units);
    if (!target) {
      return { roomId: room.id, type: ActionType.END_TURN, sequenceNumber: sequenceBase };
    }

    const dist = manhattan(actingUnit.position, target.position);

    // Attack if adjacent (distance 1)
    if (dist === 1) {
      return {
        roomId: room.id,
        type: ActionType.ATTACK,
        sequenceNumber: sequenceBase,
        payload: { attackerUnitId: actingUnit.id, targetUnitId: target.id },
      };
    }

    // Otherwise move towards target
    const movePos = this.bestMoveToward(actingUnit, target, botPlayer.units, humanPlayer.units);
    if (movePos) {
      return {
        roomId: room.id,
        type: ActionType.MOVE_UNIT,
        sequenceNumber: sequenceBase,
        payload: { unitId: actingUnit.id, position: movePos },
      };
    }

    // No valid move — mark unit as done by ending turn if no other units can act
    const anyUnitCanAct = botPlayer.units.some((u) => !u.actionUsed && u.id !== actingUnit.id);
    if (!anyUnitCanAct) {
      return { roomId: room.id, type: ActionType.END_TURN, sequenceNumber: sequenceBase };
    }

    return null; // other units will be tried next cycle
  }

  private findClosestEnemy(unit: UnitState, enemies: UnitState[]): UnitState | null {
    if (!enemies.length) return null;
    return enemies.reduce((closest, e) =>
      manhattan(unit.position, e.position) < manhattan(unit.position, closest.position) ? e : closest,
    );
  }

  private bestMoveToward(
    unit: UnitState,
    target: UnitState,
    friendlyUnits: UnitState[],
    enemyUnits: UnitState[],
  ): { x: number; y: number } | null {
    const allUnits = [...friendlyUnits, ...enemyUnits];
    const candidates: Array<{ pos: { x: number; y: number }; dist: number }> = [];

    // BFS up to speed tiles — find the cell closest to target without collision
    for (let dx = -unit.speed; dx <= unit.speed; dx++) {
      for (let dy = -(unit.speed - Math.abs(dx)); dy <= unit.speed - Math.abs(dx); dy++) {
        const nx = unit.position.x + dx;
        const ny = unit.position.y + dy;
        if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) continue;
        if (dx === 0 && dy === 0) continue;
        if (isOccupied({ x: nx, y: ny }, allUnits, unit.id)) continue;
        candidates.push({ pos: { x: nx, y: ny }, dist: manhattan({ x: nx, y: ny }, target.position) });
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.dist - b.dist);
    return candidates[0].pos;
  }
}
