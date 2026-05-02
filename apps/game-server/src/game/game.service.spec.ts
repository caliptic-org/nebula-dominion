/**
 * CAL-144: Compatibility tests for PvP matchmaking and real-time battle flow.
 * Verifies battle events fire in correct order and game state transitions are correct.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { GameService, ActionResult, GameCreatedEvent } from './game.service';
import { RoomService, GameRoom, GameStatus, TurnPhase, UnitState, PlayerState } from './room.service';
import { SessionService } from './session.service';
import { EloService } from '../matchmaking/elo.service';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import { ActionType, GameActionDto } from './dto/game-action.dto';
import { Race, GameMode } from '../matchmaking/dto/join-queue.dto';
import { MatchResult } from '../matchmaking/matchmaking.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(overrides: Partial<UnitState> = {}): UnitState {
  return {
    id: `unit-${Math.random().toString(36).slice(2)}`,
    type: 'soldier',
    hp: 30, maxHp: 30, attack: 8, defense: 5, speed: 3,
    position: { x: 0, y: 0 },
    actionUsed: false,
    ...overrides,
  };
}

function makePlayer(userId: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    userId,
    socketId: `socket-${userId}`,
    race: Race.HUMAN,
    elo: 1000,
    gamesPlayed: 50,
    hp: 100,
    mana: 50,
    units: [makeUnit({ id: `${userId}-u1`, position: { x: 0, y: 0 } })],
    connected: true,
    lastActionSequence: 0,
    ...overrides,
  };
}

function makeRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: 'room-1',
    matchId: 'match-1',
    status: GameStatus.IN_PROGRESS,
    mode: 'ranked',
    currentTurn: 1,
    currentPlayerId: 'user-1',
    phase: TurnPhase.ACTION,
    players: {
      'user-1': makePlayer('user-1', { units: [makeUnit({ id: 'u1', position: { x: 0, y: 0 } })] }),
      'user-2': makePlayer('user-2', { units: [makeUnit({ id: 'u2', position: { x: 2, y: 0 } })] }),
    },
    stateHash: 'hash',
    createdAt: Date.now() - 1000,
    turnStartedAt: Date.now(),
    ...overrides,
  };
}

function makeDto(overrides: Partial<GameActionDto> = {}): GameActionDto {
  return {
    roomId: 'room-1',
    type: ActionType.ATTACK,
    sequenceNumber: 1,
    payload: { attackerUnitId: 'u1', targetUnitId: 'u2' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Build a GameService with mocked dependencies
// ---------------------------------------------------------------------------

function buildService(): {
  svc: GameService;
  emitter: EventEmitter2;
  savedRooms: GameRoom[];
  removedFromActive: string[];
} {
  const savedRooms: GameRoom[] = [];
  const removedFromActive: string[] = [];
  let currentRoom: GameRoom | null = null;

  const roomsMock: Partial<RoomService> = {
    get: jest.fn().mockImplementation(async () => currentRoom),
    create: jest.fn().mockImplementation(async (_matchId: string, p1: any, p2: any, mode: string) => {
      const room = makeRoom({
        matchId: _matchId,
        mode,
        players: {
          [p1.userId]: makePlayer(p1.userId, { socketId: p1.socketId }),
          [p2.userId]: makePlayer(p2.userId, { socketId: p2.socketId }),
        },
      });
      currentRoom = { ...room };
      return room;
    }),
    save: jest.fn().mockImplementation(async (room: GameRoom) => {
      currentRoom = { ...room };
      savedRooms.push({ ...room });
    }),
    setUserRoom: jest.fn().mockResolvedValue(undefined),
    addToActiveRooms: jest.fn().mockResolvedValue(undefined),
    removeFromActiveRooms: jest.fn().mockImplementation(async (id: string) => {
      removedFromActive.push(id);
    }),
    getActiveRoomIds: jest.fn().mockResolvedValue([]),
    clearUserRoom: jest.fn().mockResolvedValue(undefined),
    hashState: jest.fn().mockReturnValue('newhash'),
  };

  const sessionsMock: Partial<SessionService> = {
    create: jest.fn().mockResolvedValue('reconnect-token'),
  };

  const antiCheatMock: Partial<AntiCheatService> = {
    validate: jest.fn().mockReturnValue(null),
  };

  const progressionMock = {
    awardXp: jest.fn().mockResolvedValue(undefined),
  };

  const configMock: Partial<ConfigService> = {
    get: jest.fn().mockImplementation((key: string, def: any) => {
      if (key === 'game.maxRoundDurationMs') return 30000;
      return def;
    }),
  };

  const emitter = new EventEmitter2();

  const mergeServiceMock = {
    findRecipe: jest.fn().mockReturnValue(null),
    merge: jest.fn(),
    mutate: jest.fn().mockReturnValue(null),
    getAvailableMutationsForUnit: jest.fn().mockReturnValue([]),
  };

  const svc = new GameService(
    roomsMock as RoomService,
    sessionsMock as SessionService,
    new EloService(),
    antiCheatMock as AntiCheatService,
    emitter,
    configMock as ConfigService,
    progressionMock as any,
    mergeServiceMock as any,
  );

  // Provide a way to set the current room for a test
  (svc as any).__setRoom = (room: GameRoom) => {
    currentRoom = room;
    (roomsMock.get as jest.Mock).mockImplementation(async () => ({ ...currentRoom }));
  };

  return { svc, emitter, savedRooms, removedFromActive };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GameService — battle event ordering', () => {
  it('ATTACK emits unit_attacked event with correct damage', async () => {
    const { svc } = buildService();
    const room = makeRoom();
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.ATTACK,
      payload: { attackerUnitId: 'u1', targetUnitId: 'u2' },
    }));

    expect(result.success).toBe(true);
    const attackedEvent = result.events.find(e => e.type === 'unit_attacked');
    expect(attackedEvent).toBeDefined();
    expect(attackedEvent!.data.attackerUnitId).toBe('u1');
    expect(attackedEvent!.data.targetUnitId).toBe('u2');
    // soldier: attack=8, defense=5 → damage=3
    expect(attackedEvent!.data.damage).toBe(3);
  });

  it('ATTACK fires unit_died after unit_attacked when target HP drops to 0', async () => {
    const { svc } = buildService();
    const room = makeRoom({
      players: {
        'user-1': makePlayer('user-1', { units: [makeUnit({ id: 'u1', attack: 50 })] }),
        // target has 1 HP — will die on any hit
        'user-2': makePlayer('user-2', { units: [makeUnit({ id: 'u2', hp: 1, maxHp: 30, defense: 0 })] }),
      },
    });
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.ATTACK,
      payload: { attackerUnitId: 'u1', targetUnitId: 'u2' },
    }));

    expect(result.success).toBe(true);
    const types = result.events.map(e => e.type);
    expect(types.indexOf('unit_attacked')).toBeLessThan(types.indexOf('unit_died'));
  });

  it('game_end fires after unit_died when last enemy unit is destroyed', async () => {
    const { svc } = buildService();
    const room = makeRoom({
      players: {
        'user-1': makePlayer('user-1', { units: [makeUnit({ id: 'u1', attack: 50 })] }),
        // opponent has only one unit with 1 HP
        'user-2': makePlayer('user-2', { units: [makeUnit({ id: 'u2', hp: 1, defense: 0 })] }),
      },
    });
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.ATTACK,
      payload: { attackerUnitId: 'u1', targetUnitId: 'u2' },
    }));

    const types = result.events.map(e => e.type);
    expect(types).toContain('unit_attacked');
    expect(types).toContain('unit_died');
    expect(types).toContain('game_end');

    // Correct order: unit_attacked → unit_died → game_end
    expect(types.indexOf('unit_attacked')).toBeLessThan(types.indexOf('unit_died'));
    expect(types.indexOf('unit_died')).toBeLessThan(types.indexOf('game_end'));
  });

  it('game_end event contains winner, loser, and eloDelta fields', async () => {
    const { svc } = buildService();
    const room = makeRoom({
      players: {
        'user-1': makePlayer('user-1', { units: [makeUnit({ id: 'u1', attack: 50 })] }),
        'user-2': makePlayer('user-2', { units: [makeUnit({ id: 'u2', hp: 1, defense: 0 })] }),
      },
    });
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.ATTACK,
      payload: { attackerUnitId: 'u1', targetUnitId: 'u2' },
    }));

    const endEvent = result.events.find(e => e.type === 'game_end');
    expect(endEvent).toBeDefined();
    expect(endEvent!.data.winner).toBe('user-1');
    expect(endEvent!.data.loser).toBe('user-2');
    expect(endEvent!.data.eloDelta).toBeDefined();
    expect(endEvent!.data.newElo).toBeDefined();
    expect(endEvent!.data.endReason).toBe('all_units_destroyed');
  });

  it('SURRENDER fires player_surrendered then game_end in correct order', async () => {
    const { svc } = buildService();
    const room = makeRoom();
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.SURRENDER,
      payload: undefined,
    }));

    expect(result.success).toBe(true);
    const types = result.events.map(e => e.type);
    expect(types).toContain('player_surrendered');
    expect(types).toContain('game_end');
    expect(types.indexOf('player_surrendered')).toBeLessThan(types.indexOf('game_end'));

    const endEvent = result.events.find(e => e.type === 'game_end');
    expect(endEvent!.data.endReason).toBe('surrender');
    expect(endEvent!.data.winner).toBe('user-2'); // opponent wins
    expect(endEvent!.data.loser).toBe('user-1');  // surrendering player loses
  });

  it('END_TURN fires turn_ended with correct nextPlayerId', async () => {
    const { svc } = buildService();
    const room = makeRoom({ currentPlayerId: 'user-1' });
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.END_TURN,
      payload: undefined,
    }));

    expect(result.success).toBe(true);
    const turnEndedEvent = result.events.find(e => e.type === 'turn_ended');
    expect(turnEndedEvent).toBeDefined();
    expect(turnEndedEvent!.data.nextPlayerId).toBe('user-2');
    expect(result.room!.currentPlayerId).toBe('user-2');
    expect(result.room!.currentTurn).toBe(2);
  });

  it('END_TURN resets actionUsed for current player units', async () => {
    const { svc } = buildService();
    const room = makeRoom();
    room.players['user-1'].units[0].actionUsed = true;
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.END_TURN,
      payload: undefined,
    }));

    // After turn ends, user-1's unit actionUsed should be reset
    expect(result.room!.players['user-1'].units[0].actionUsed).toBe(false);
  });

  it('END_TURN grants opponent mana regen', async () => {
    const { svc } = buildService();
    const room = makeRoom({ currentPlayerId: 'user-1' });
    room.players['user-2'].mana = 40;
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.END_TURN,
      payload: undefined,
    }));

    // opponent should receive +10 mana
    expect(result.room!.players['user-2'].mana).toBe(50);
  });

  it('MOVE_UNIT fires unit_moved event with new position', async () => {
    const { svc } = buildService();
    const room = makeRoom();
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.MOVE_UNIT,
      payload: { unitId: 'u1', position: { x: 2, y: 0 } },
    }));

    expect(result.success).toBe(true);
    const movedEvent = result.events.find(e => e.type === 'unit_moved');
    expect(movedEvent).toBeDefined();
    expect(movedEvent!.data.unitId).toBe('u1');
    expect(movedEvent!.data.position).toEqual({ x: 2, y: 0 });
  });

  it('MOVE_UNIT rejects movement beyond unit speed', async () => {
    const { svc } = buildService();
    const room = makeRoom();
    room.players['user-1'].units[0].speed = 2;
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.MOVE_UNIT,
      payload: { unitId: 'u1', position: { x: 5, y: 5 } }, // distance 10, speed 2
    }));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/speed/i);
  });

  it('ATTACK rejects action when unit already acted this turn', async () => {
    const { svc } = buildService();
    const room = makeRoom();
    room.players['user-1'].units[0].actionUsed = true;
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.ATTACK,
      payload: { attackerUnitId: 'u1', targetUnitId: 'u2' },
    }));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already acted/i);
  });

  it('ATTACK fails when it is not the player turn', async () => {
    const { svc } = buildService();
    const room = makeRoom({ currentPlayerId: 'user-1' });
    (svc as any).__setRoom(room);

    // user-2 tries to attack but it's user-1's turn
    const result = await svc.processAction('user-2', makeDto({
      type: ActionType.ATTACK,
      payload: { attackerUnitId: 'u2', targetUnitId: 'u1' },
    }));

    expect(result.success).toBe(false);
  });

  it('game room becomes FINISHED and removed from active rooms after game_end', async () => {
    const { svc, removedFromActive } = buildService();
    const room = makeRoom({
      players: {
        'user-1': makePlayer('user-1', { units: [makeUnit({ id: 'u1', attack: 50 })] }),
        'user-2': makePlayer('user-2', { units: [makeUnit({ id: 'u2', hp: 1, defense: 0 })] }),
      },
    });
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.ATTACK,
      payload: { attackerUnitId: 'u1', targetUnitId: 'u2' },
    }));

    expect(result.room!.status).toBe(GameStatus.FINISHED);
    expect(result.room!.winner).toBe('user-1');
    expect(removedFromActive).toContain('room-1');
  });
});

describe('GameService — game creation flow', () => {
  it('onMatchFound emits game.created event with room and tokens', async () => {
    const { svc, emitter } = buildService();

    const events: GameCreatedEvent[] = [];
    emitter.on('game.created', (e) => events.push(e));

    const matchResult: MatchResult = {
      matchId: 'match-test',
      player1: { userId: 'p1', socketId: 'sock1', elo: 1000, gamesPlayed: 20, race: Race.HUMAN, mode: GameMode.RANKED, queuedAt: Date.now() },
      player2: { userId: 'p2', socketId: 'sock2', elo: 1050, gamesPlayed: 30, race: Race.ZERG, mode: GameMode.RANKED, queuedAt: Date.now() },
    };

    await (svc as any).onMatchFound(matchResult);

    expect(events).toHaveLength(1);
    expect(events[0].room).toBeDefined();
    expect(events[0].tokens['p1']).toBeDefined();
    expect(events[0].tokens['p2']).toBeDefined();
    expect(events[0].room.status).toBe(GameStatus.IN_PROGRESS);
  });

  it('game.turn_ended is emitted after END_TURN', async () => {
    const { svc, emitter } = buildService();
    const room = makeRoom();
    (svc as any).__setRoom(room);

    const turnEndedEvents: any[] = [];
    emitter.on('game.turn_ended', (e) => turnEndedEvents.push(e));

    await svc.processAction('user-1', makeDto({ type: ActionType.END_TURN, payload: undefined }));

    expect(turnEndedEvents).toHaveLength(1);
    expect(turnEndedEvents[0].newPlayerId).toBe('user-2');
  });
});

describe('GameService — damage formula verification', () => {
  it('minimum damage is always 1 (no negative damage)', async () => {
    const { svc } = buildService();
    const room = makeRoom({
      players: {
        'user-1': makePlayer('user-1', {
          units: [makeUnit({ id: 'u1', attack: 1 })],
        }),
        'user-2': makePlayer('user-2', {
          // Very high defense — damage should be 0 without the max(1) floor
          units: [makeUnit({ id: 'u2', hp: 100, defense: 100 })],
        }),
      },
    });
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.ATTACK,
      payload: { attackerUnitId: 'u1', targetUnitId: 'u2' },
    }));

    expect(result.success).toBe(true);
    const attackedEvent = result.events.find(e => e.type === 'unit_attacked');
    expect(attackedEvent!.data.damage).toBeGreaterThanOrEqual(1);
  });

  it('damage = max(1, attack - defense)', async () => {
    const { svc } = buildService();
    const room = makeRoom({
      players: {
        'user-1': makePlayer('user-1', { units: [makeUnit({ id: 'u1', attack: 15 })] }),
        'user-2': makePlayer('user-2', { units: [makeUnit({ id: 'u2', hp: 100, defense: 8 })] }),
      },
    });
    (svc as any).__setRoom(room);

    const result = await svc.processAction('user-1', makeDto({
      type: ActionType.ATTACK,
      payload: { attackerUnitId: 'u1', targetUnitId: 'u2' },
    }));

    const attackedEvent = result.events.find(e => e.type === 'unit_attacked');
    expect(attackedEvent!.data.damage).toBe(7); // 15 - 8 = 7
  });
});

describe('GameService — PvE bot anti-cheat bypass', () => {
  it('bot actions skip anti-cheat validation', async () => {
    const savedRooms: GameRoom[] = [];
    let currentRoom: GameRoom | null = null;

    const antiCheatValidate = jest.fn().mockReturnValue('would fail');

    const roomsMock: Partial<RoomService> = {
      get: jest.fn().mockImplementation(async () => currentRoom ? { ...currentRoom } : null),
      save: jest.fn().mockImplementation(async (room: GameRoom) => { currentRoom = room; savedRooms.push(room); }),
      removeFromActiveRooms: jest.fn().mockResolvedValue(undefined),
      hashState: jest.fn().mockReturnValue('hash'),
    };

    const svc = new GameService(
      roomsMock as RoomService,
      { create: jest.fn().mockResolvedValue('token') } as any,
      new EloService(),
      { validate: antiCheatValidate } as any,
      new EventEmitter2(),
      { get: jest.fn().mockImplementation((_k: string, def: any) => def) } as any,
      { awardXp: jest.fn().mockResolvedValue(undefined) } as any,
      { findRecipe: jest.fn().mockReturnValue(null), merge: jest.fn(), mutate: jest.fn().mockReturnValue(null), getAvailableMutationsForUnit: jest.fn().mockReturnValue([]) } as any,
    );

    const botId = 'bot:test-bot-id';
    const room = makeRoom({
      currentPlayerId: botId,
      players: {
        [botId]: makePlayer(botId, { units: [makeUnit({ id: 'bu1', attack: 50 })] }),
        'user-1': makePlayer('user-1', { units: [makeUnit({ id: 'hu1', hp: 1, defense: 0 })] }),
      },
    });
    currentRoom = room;
    (roomsMock.get as jest.Mock).mockResolvedValue({ ...room });

    const result = await svc.processAction(botId, makeDto({
      roomId: room.id,
      type: ActionType.ATTACK,
      payload: { attackerUnitId: 'bu1', targetUnitId: 'hu1' },
    }));

    // anti-cheat should NOT have been called for bot player
    expect(antiCheatValidate).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
