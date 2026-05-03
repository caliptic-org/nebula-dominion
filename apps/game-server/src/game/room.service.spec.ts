/**
 * CAL-144: Compatibility tests for room state management.
 * Verifies disconnect/reconnect preserves game state per design spec.
 */
import { RoomService, GameRoom, GameStatus, TurnPhase, PlayerState, UnitState } from './room.service';
import { ConfigService } from '@nestjs/config';
import { Race } from '../matchmaking/dto/join-queue.dto';

// ---------------------------------------------------------------------------
// Redis mock
// ---------------------------------------------------------------------------

class FakeRedis {
  private store: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();

  async connect() {}
  disconnect() {}

  async set(key: string, value: string, ..._args: any[]): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const k of keys) if (this.store.delete(k)) n++;
    return n;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    for (const m of members) this.sets.get(key)!.add(m);
    return members.length;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const s = this.sets.get(key);
    if (!s) return 0;
    let n = 0;
    for (const m of members) if (s.delete(m)) n++;
    return n;
  }

  async smembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }

  pipeline() {
    const ops: Array<() => Promise<any>> = [];
    const pipe: any = {
      set: (key: string, value: string, ...args: any[]) => {
        ops.push(() => this.set(key, value, ...args));
        return pipe;
      },
      del: (...keys: string[]) => {
        ops.push(() => this.del(...keys));
        return pipe;
      },
      exec: () => Promise.all(ops.map(op => op())),
    };
    return pipe;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(id: string): UnitState {
  return {
    id,
    type: 'soldier',
    hp: 30, maxHp: 30, attack: 8, defense: 5, speed: 3,
    position: { x: 0, y: 0 },
    actionUsed: false,
  };
}

function buildRoomService(): { svc: RoomService; redis: FakeRedis } {
  const redis = new FakeRedis();
  const config: Partial<ConfigService> = {
    get: jest.fn().mockImplementation((key: string, def: any) => {
      if (key === 'redisUrl') return 'redis://localhost:6379';
      if (key === 'game.roomTtlSeconds') return 3600;
      return def;
    }),
  };

  const svc = new RoomService(config as ConfigService);
  (svc as any).redis = redis;
  return { svc, redis };
}

async function createTestRoom(svc: RoomService): Promise<GameRoom> {
  return svc.create(
    'match-1',
    { userId: 'user-1', socketId: 's1', race: Race.HUMAN, elo: 1000, gamesPlayed: 20 },
    { userId: 'user-2', socketId: 's2', race: Race.ZERG, elo: 1050, gamesPlayed: 30 },
    'ranked',
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RoomService — room creation', () => {
  it('creates a room with both players and WAITING status', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);

    expect(room.status).toBe(GameStatus.WAITING);
    expect(Object.keys(room.players)).toHaveLength(2);
    expect(room.players['user-1']).toBeDefined();
    expect(room.players['user-2']).toBeDefined();
  });

  it('starts in DEPLOY phase with turn 1', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);

    expect(room.phase).toBe(TurnPhase.DEPLOY);
    expect(room.currentTurn).toBe(1);
  });

  it('assigns starting units based on race', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);

    // HUMAN starts with 4 units: 2x soldier, 1x mage, 1x archer
    const p1Units = room.players['user-1'].units;
    expect(p1Units.length).toBe(4);
    const unitTypes = p1Units.map(u => u.type);
    expect(unitTypes.filter(t => t === 'soldier')).toHaveLength(2);
    expect(unitTypes).toContain('mage');
    expect(unitTypes).toContain('archer');

    // ZERG starts with 4 units: 3x drone, 1x guardian
    const p2Units = room.players['user-2'].units;
    expect(p2Units.length).toBe(4);
    const zergTypes = p2Units.map(u => u.type);
    expect(zergTypes.filter(t => t === 'drone')).toHaveLength(3);
    expect(zergTypes).toContain('guardian');
  });

  it('initializes players with correct starting HP and mana', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);

    expect(room.players['user-1'].hp).toBe(100);
    expect(room.players['user-1'].mana).toBe(50);
    expect(room.players['user-2'].hp).toBe(100);
    expect(room.players['user-2'].mana).toBe(50);
  });

  it('can retrieve the room by ID after creation', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);

    const retrieved = await svc.get(room.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(room.id);
  });

  it('can retrieve the room by user ID', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);
    await svc.setUserRoom('user-1', room.id);

    const retrieved = await svc.getRoomByUser('user-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(room.id);
  });
});

describe('RoomService — disconnect / reconnect state management', () => {
  it('room transitions to PAUSED when a player disconnects from IN_PROGRESS', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);
    room.status = GameStatus.IN_PROGRESS;
    await svc.save(room);

    const updated = await svc.setPlayerConnection(room.id, 'user-1', false);

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe(GameStatus.PAUSED);
    expect(updated!.players['user-1'].connected).toBe(false);
  });

  it('player.disconnectedAt is set on disconnect', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);
    room.status = GameStatus.IN_PROGRESS;
    await svc.save(room);

    const before = Date.now();
    const updated = await svc.setPlayerConnection(room.id, 'user-1', false);
    const after = Date.now();

    expect(updated!.players['user-1'].disconnectedAt).toBeGreaterThanOrEqual(before);
    expect(updated!.players['user-1'].disconnectedAt).toBeLessThanOrEqual(after);
  });

  it('room resumes IN_PROGRESS when disconnected player reconnects (all connected)', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);
    room.status = GameStatus.IN_PROGRESS;
    await svc.save(room);

    // Disconnect user-1
    await svc.setPlayerConnection(room.id, 'user-1', false);

    // Reconnect user-1
    const updated = await svc.setPlayerConnection(room.id, 'user-1', true, 'new-socket-id');

    expect(updated!.status).toBe(GameStatus.IN_PROGRESS);
    expect(updated!.players['user-1'].connected).toBe(true);
    expect(updated!.players['user-1'].socketId).toBe('new-socket-id');
  });

  it('room stays PAUSED when only one of two disconnected players reconnects', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);
    room.status = GameStatus.IN_PROGRESS;
    await svc.save(room);

    // Disconnect both players
    await svc.setPlayerConnection(room.id, 'user-1', false);
    await svc.setPlayerConnection(room.id, 'user-2', false);

    // Only user-1 reconnects
    const updated = await svc.setPlayerConnection(room.id, 'user-1', true, 'new-socket');

    expect(updated!.status).toBe(GameStatus.PAUSED);
  });

  it('game state (units, mana, turn) is fully preserved during disconnect/reconnect', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);
    room.status = GameStatus.IN_PROGRESS;
    room.currentTurn = 5;
    room.players['user-1'].mana = 70;
    room.players['user-1'].units[0].hp = 15;
    await svc.save(room);

    // Disconnect
    await svc.setPlayerConnection(room.id, 'user-1', false);
    // Reconnect
    const after = await svc.setPlayerConnection(room.id, 'user-1', true);

    expect(after!.currentTurn).toBe(5);
    expect(after!.players['user-1'].mana).toBe(70);
    expect(after!.players['user-1'].units[0].hp).toBe(15);
  });

  it('disconnectedAt is cleared when player reconnects', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);
    room.status = GameStatus.IN_PROGRESS;
    await svc.save(room);

    await svc.setPlayerConnection(room.id, 'user-1', false);
    const reconnected = await svc.setPlayerConnection(room.id, 'user-1', true);

    expect(reconnected!.players['user-1'].disconnectedAt).toBeUndefined();
  });

  it('disconnect from FINISHED room does not change status', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);
    room.status = GameStatus.FINISHED;
    await svc.save(room);

    const updated = await svc.setPlayerConnection(room.id, 'user-1', false);
    // Status should remain FINISHED — disconnect from finished game is a no-op for status
    expect(updated!.status).toBe(GameStatus.FINISHED);
  });

  it('returns null when room does not exist', async () => {
    const { svc } = buildRoomService();
    const result = await svc.setPlayerConnection('nonexistent-room', 'user-1', false);
    expect(result).toBeNull();
  });
});

describe('RoomService — active rooms management', () => {
  it('addToActiveRooms and getActiveRoomIds work correctly', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);

    await svc.addToActiveRooms(room.id);
    const ids = await svc.getActiveRoomIds();
    expect(ids).toContain(room.id);
  });

  it('removeFromActiveRooms removes the room from active set', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);

    await svc.addToActiveRooms(room.id);
    await svc.removeFromActiveRooms(room.id);
    const ids = await svc.getActiveRoomIds();
    expect(ids).not.toContain(room.id);
  });
});

describe('RoomService — state hash consistency', () => {
  it('same room state produces same hash', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);

    const h1 = svc.hashState(room);
    const h2 = svc.hashState(room);
    expect(h1).toBe(h2);
  });

  it('different player states produce different hashes', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);

    const h1 = svc.hashState(room);

    room.players['user-1'].mana = 99;
    const h2 = svc.hashState(room);

    expect(h1).not.toBe(h2);
  });

  it('different turn number produces different hash', async () => {
    const { svc } = buildRoomService();
    const room = await createTestRoom(svc);

    const h1 = svc.hashState(room);
    room.currentTurn = 5;
    const h2 = svc.hashState(room);

    expect(h1).not.toBe(h2);
  });
});
