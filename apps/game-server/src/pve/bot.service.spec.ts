/**
 * CAL-144: Compatibility tests for PvE bot AI behavior.
 * Verifies bot decision algorithm matches the design document spec.
 */
import { BotService } from './bot.service';
import { GameRoom, GameStatus, TurnPhase, UnitState, PlayerState } from '../game/room.service';
import { ActionType } from '../game/dto/game-action.dto';
import { Race } from '../matchmaking/dto/join-queue.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOT_ID = 'bot:test-bot';
const PLAYER_ID = 'player-1';

function makeUnit(id: string, overrides: Partial<UnitState> = {}): UnitState {
  return {
    id,
    type: 'soldier',
    hp: 30, maxHp: 30,
    attack: 8, defense: 5, speed: 3,
    position: { x: 0, y: 0 },
    actionUsed: false,
    ...overrides,
  };
}

function makePlayer(userId: string, units: UnitState[], mana = 50, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    userId,
    socketId: `s-${userId}`,
    race: Race.HUMAN,
    elo: 1000,
    gamesPlayed: 10,
    hp: 100,
    mana,
    units,
    connected: true,
    lastActionSequence: 0,
    ...overrides,
  };
}

function makeRoom(botUnits: UnitState[], humanUnits: UnitState[], phase = TurnPhase.ACTION, mana = 50): GameRoom {
  return {
    id: 'room-pvp',
    matchId: 'match-pve',
    status: GameStatus.IN_PROGRESS,
    mode: 'pve',
    currentTurn: 1,
    currentPlayerId: BOT_ID,
    phase,
    players: {
      [BOT_ID]: makePlayer(BOT_ID, botUnits, mana),
      [PLAYER_ID]: makePlayer(PLAYER_ID, humanUnits),
    },
    stateHash: 'hash',
    createdAt: Date.now(),
    turnStartedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BotService — DEPLOY phase', () => {
  let bot: BotService;
  beforeEach(() => { bot = new BotService(); });

  it('returns END_TURN immediately during DEPLOY phase', () => {
    const room = makeRoom(
      [makeUnit('b1', { position: { x: 0, y: 0 } })],
      [makeUnit('h1', { position: { x: 7, y: 5 } })],
      TurnPhase.DEPLOY,
    );

    const action = bot.decideAction(room, BOT_ID, 1);
    expect(action).not.toBeNull();
    expect(action!.type).toBe(ActionType.END_TURN);
  });
});

describe('BotService — ACTION phase: attack priority', () => {
  let bot: BotService;
  beforeEach(() => { bot = new BotService(); });

  it('attacks when enemy is adjacent (manhattan distance = 1)', () => {
    const botUnit = makeUnit('b1', { position: { x: 3, y: 3 } });
    const humanUnit = makeUnit('h1', { position: { x: 4, y: 3 } }); // dist = 1

    // mana = 0 so ability threshold (30) is not met, ensuring attack takes priority
    const room = makeRoom([botUnit], [humanUnit], TurnPhase.ACTION, 0);
    const action = bot.decideAction(room, BOT_ID, 1);

    expect(action).not.toBeNull();
    expect(action!.type).toBe(ActionType.ATTACK);
    expect((action!.payload as any).attackerUnitId).toBe('b1');
    expect((action!.payload as any).targetUnitId).toBe('h1');
  });

  it('attacks when enemy is adjacent vertically (y+1)', () => {
    const botUnit = makeUnit('b1', { position: { x: 2, y: 2 } });
    const humanUnit = makeUnit('h1', { position: { x: 2, y: 3 } }); // dist = 1

    const room = makeRoom([botUnit], [humanUnit], TurnPhase.ACTION, 0);
    const action = bot.decideAction(room, BOT_ID, 1);

    expect(action!.type).toBe(ActionType.ATTACK);
  });
});

describe('BotService — ACTION phase: movement', () => {
  let bot: BotService;
  beforeEach(() => { bot = new BotService(); });

  it('moves toward target when not adjacent', () => {
    const botUnit = makeUnit('b1', { position: { x: 0, y: 0 }, speed: 3 });
    const humanUnit = makeUnit('h1', { position: { x: 7, y: 5 } });

    // mana = 0 to prevent ability use taking priority
    const room = makeRoom([botUnit], [humanUnit], TurnPhase.ACTION, 0);
    const action = bot.decideAction(room, BOT_ID, 1);

    expect(action).not.toBeNull();
    expect(action!.type).toBe(ActionType.MOVE_UNIT);
    expect((action!.payload as any).unitId).toBe('b1');

    // After move, bot should be closer to target
    const newPos = (action!.payload as any).position;
    const origDist = Math.abs(0 - 7) + Math.abs(0 - 5);
    const newDist = Math.abs(newPos.x - 7) + Math.abs(newPos.y - 5);
    expect(newDist).toBeLessThan(origDist);
  });

  it('move does not exceed unit speed (Manhattan distance)', () => {
    const botUnit = makeUnit('b1', { position: { x: 0, y: 0 }, speed: 2 });
    const humanUnit = makeUnit('h1', { position: { x: 7, y: 5 } });

    const room = makeRoom([botUnit], [humanUnit], TurnPhase.ACTION, 0);
    const action = bot.decideAction(room, BOT_ID, 1);

    if (action!.type === ActionType.MOVE_UNIT) {
      const newPos = (action!.payload as any).position;
      const dx = Math.abs(newPos.x - 0);
      const dy = Math.abs(newPos.y - 0);
      expect(dx + dy).toBeLessThanOrEqual(2);
    }
  });

  it('stays within grid bounds (8x6)', () => {
    // Bot at bottom-right corner, target even further right (off grid)
    const botUnit = makeUnit('b1', { position: { x: 7, y: 5 }, speed: 3 });
    const humanUnit = makeUnit('h1', { position: { x: 0, y: 0 } });

    const room = makeRoom([botUnit], [humanUnit], TurnPhase.ACTION, 0);
    const action = bot.decideAction(room, BOT_ID, 1);

    if (action && action.type === ActionType.MOVE_UNIT) {
      const pos = (action.payload as any).position;
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThan(8);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThan(6);
    }
  });

  it('does not move to an occupied cell', () => {
    const botUnit = makeUnit('b1', { position: { x: 0, y: 0 }, speed: 3 });
    // Block adjacent cells with a friendly unit
    const friendlyUnit = makeUnit('b2', { position: { x: 1, y: 0 }, actionUsed: true });
    const humanUnit = makeUnit('h1', { position: { x: 3, y: 0 } });

    const room = makeRoom([botUnit, friendlyUnit], [humanUnit], TurnPhase.ACTION, 0);
    const action = bot.decideAction(room, BOT_ID, 1);

    if (action && action.type === ActionType.MOVE_UNIT) {
      const pos = (action.payload as any).position;
      // Should not move to (1, 0) which is occupied by friendlyUnit
      expect(pos).not.toEqual({ x: 1, y: 0 });
    }
  });
});

describe('BotService — ACTION phase: ability use', () => {
  let bot: BotService;
  beforeEach(() => { bot = new BotService(); });

  it('uses ability when mana >= 30 and unit HP > 50% max', () => {
    const botUnit = makeUnit('b1', { hp: 25, maxHp: 30, position: { x: 0, y: 0 } }); // 83% HP
    const humanUnit = makeUnit('h1', { position: { x: 5, y: 5 } });

    const room = makeRoom([botUnit], [humanUnit], TurnPhase.ACTION, 30); // exactly 30 mana

    const action = bot.decideAction(room, BOT_ID, 1);
    expect(action).not.toBeNull();
    expect(action!.type).toBe(ActionType.USE_ABILITY);
    expect((action!.payload as any).unitId).toBe('b1');
  });

  it('does NOT use ability when mana < 30', () => {
    const botUnit = makeUnit('b1', { hp: 30, maxHp: 30, position: { x: 0, y: 0 } });
    const humanUnit = makeUnit('h1', { position: { x: 5, y: 5 } });

    const room = makeRoom([botUnit], [humanUnit], TurnPhase.ACTION, 29); // below threshold

    const action = bot.decideAction(room, BOT_ID, 1);
    // Should not be USE_ABILITY
    expect(action!.type).not.toBe(ActionType.USE_ABILITY);
  });

  it('does NOT use ability when unit HP <= 50% max (unit is low health)', () => {
    const botUnit = makeUnit('b1', { hp: 15, maxHp: 30, position: { x: 0, y: 0 } }); // exactly 50%
    const humanUnit = makeUnit('h1', { position: { x: 5, y: 5 } });

    const room = makeRoom([botUnit], [humanUnit], TurnPhase.ACTION, 50);

    const action = bot.decideAction(room, BOT_ID, 1);
    expect(action!.type).not.toBe(ActionType.USE_ABILITY);
  });
});

describe('BotService — ACTION phase: turn management', () => {
  let bot: BotService;
  beforeEach(() => { bot = new BotService(); });

  it('returns END_TURN when all bot units have acted', () => {
    const botUnit1 = makeUnit('b1', { position: { x: 0, y: 0 }, actionUsed: true });
    const botUnit2 = makeUnit('b2', { position: { x: 0, y: 1 }, actionUsed: true });
    const humanUnit = makeUnit('h1', { position: { x: 7, y: 5 } });

    const room = makeRoom([botUnit1, botUnit2], [humanUnit]);

    const action = bot.decideAction(room, BOT_ID, 1);
    expect(action!.type).toBe(ActionType.END_TURN);
  });

  it('acts with next unacted unit when first unit has already acted', () => {
    const actedUnit = makeUnit('b1', { position: { x: 0, y: 0 }, actionUsed: true });
    const freshUnit = makeUnit('b2', { position: { x: 0, y: 2 }, speed: 3 });
    const humanUnit = makeUnit('h1', { position: { x: 7, y: 5 } });

    const room = makeRoom([actedUnit, freshUnit], [humanUnit]);
    const action = bot.decideAction(room, BOT_ID, 1);

    // Should act with b2, not b1
    expect(action!.type).not.toBe(ActionType.END_TURN);
    if (action!.type === ActionType.MOVE_UNIT || action!.type === ActionType.ATTACK) {
      const payload = action!.payload as any;
      expect(payload.unitId ?? payload.attackerUnitId).toBe('b2');
    }
  });

  it('returns END_TURN when there are no enemy units left', () => {
    const botUnit = makeUnit('b1', { position: { x: 0, y: 0 } });
    const room = makeRoom([botUnit], [], TurnPhase.ACTION, 0); // no human units, no mana

    const action = bot.decideAction(room, BOT_ID, 1);
    expect(action!.type).toBe(ActionType.END_TURN);
  });

  it('returns null when bot player is not in the room', () => {
    const humanUnit = makeUnit('h1', { position: { x: 5, y: 5 } });
    const room = makeRoom([], [humanUnit]);
    delete (room.players as any)[BOT_ID]; // remove bot

    const action = bot.decideAction(room, BOT_ID, 1);
    expect(action).toBeNull();
  });
});

describe('BotService — target selection', () => {
  let bot: BotService;
  beforeEach(() => { bot = new BotService(); });

  it('attacks the closest enemy, not any random enemy', () => {
    const botUnit = makeUnit('b1', { position: { x: 3, y: 3 } });
    // h1 is adjacent, h2 is far away
    const nearEnemy = makeUnit('h1', { position: { x: 4, y: 3 } }); // dist = 1
    const farEnemy = makeUnit('h2', { position: { x: 0, y: 0 } }); // dist = 6

    // mana = 0 so ability is not triggered — attack priority kicks in
    const room = makeRoom([botUnit], [nearEnemy, farEnemy], TurnPhase.ACTION, 0);
    const action = bot.decideAction(room, BOT_ID, 1);

    expect(action!.type).toBe(ActionType.ATTACK);
    expect((action!.payload as any).targetUnitId).toBe('h1'); // closest
  });

  it('moves toward the closest enemy when multiple enemies exist', () => {
    const botUnit = makeUnit('b1', { position: { x: 4, y: 3 }, speed: 2 });
    const nearEnemy = makeUnit('h1', { position: { x: 4, y: 0 } }); // dist = 3
    const farEnemy = makeUnit('h2', { position: { x: 0, y: 0 } }); // dist = 7

    const room = makeRoom([botUnit], [nearEnemy, farEnemy], TurnPhase.ACTION, 0);
    const action = bot.decideAction(room, BOT_ID, 1);

    expect(action!.type).toBe(ActionType.MOVE_UNIT);
    // After move, should be closer to h1 (nearest enemy)
    const newPos = (action!.payload as any).position;
    const distToNear = Math.abs(newPos.x - 4) + Math.abs(newPos.y - 0);
    const distToFar = Math.abs(newPos.x - 0) + Math.abs(newPos.y - 0);
    expect(distToNear).toBeLessThan(distToFar);
  });
});

describe('BotService — sequence number handling', () => {
  let bot: BotService;
  beforeEach(() => { bot = new BotService(); });

  it('uses the provided sequenceBase in returned actions', () => {
    const botUnit = makeUnit('b1', { position: { x: 4, y: 3 } });
    const humanUnit = makeUnit('h1', { position: { x: 4, y: 4 } }); // adjacent

    const room = makeRoom([botUnit], [humanUnit], TurnPhase.ACTION, 0);
    const action = bot.decideAction(room, BOT_ID, 42);

    expect(action!.sequenceNumber).toBe(42);
  });
});
