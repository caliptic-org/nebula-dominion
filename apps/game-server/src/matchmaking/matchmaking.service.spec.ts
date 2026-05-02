import { MatchmakingService, QueueEntry } from './matchmaking.service';
import { EloService } from './elo.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { GameMode, Race } from './dto/join-queue.dto';

// ---------------------------------------------------------------------------
// Redis mock — an in-memory sorted-set + hash store sufficient for these tests
// ---------------------------------------------------------------------------

class FakeRedis {
  private zsets: Map<string, Map<string, number>> = new Map();
  private strings: Map<string, string> = new Map();

  async connect() {}
  disconnect() {}

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.zsets.has(key)) this.zsets.set(key, new Map());
    this.zsets.get(key)!.set(member, score);
    return 1;
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    const z = this.zsets.get(key);
    if (!z) return 0;
    let removed = 0;
    for (const m of members) if (z.delete(m)) removed++;
    return removed;
  }

  async zrank(key: string, member: string): Promise<number | null> {
    const z = this.zsets.get(key);
    if (!z || !z.has(member)) return null;
    const sorted = [...z.keys()].sort((a, b) => z.get(a)! - z.get(b)!);
    return sorted.indexOf(member);
  }

  async zcard(key: string): Promise<number> {
    return this.zsets.get(key)?.size ?? 0;
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const z = this.zsets.get(key);
    if (!z) return [];
    const sorted = [...z.keys()].sort((a, b) => z.get(a)! - z.get(b)!);
    return stop === -1 ? sorted.slice(start) : sorted.slice(start, stop + 1);
  }

  async set(key: string, value: string, ..._args: any[]): Promise<'OK'> {
    this.strings.set(key, value);
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const k of keys) if (this.strings.delete(k)) deleted++;
    return deleted;
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return keys.map((k) => this.strings.get(k) ?? null);
  }

  pipeline() {
    const ops: Array<() => Promise<any>> = [];
    const pipe: any = {
      zadd: (key: string, score: number, member: string) => { ops.push(() => this.zadd(key, score, member)); return pipe; },
      zrem: (key: string, ...members: string[]) => { ops.push(() => this.zrem(key, ...members)); return pipe; },
      set: (key: string, value: string, ...args: any[]) => { ops.push(() => this.set(key, value, ...args)); return pipe; },
      del: (...keys: string[]) => { ops.push(() => this.del(...keys)); return pipe; },
      exec: () => Promise.all(ops.map((op) => op())),
    };
    return pipe;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Record<string, any> = {}): ConfigService {
  const defaults: Record<string, any> = {
    redisUrl: 'redis://localhost:6379',
    'matchmaking.initialEloRange': 100,
    'matchmaking.eloExpansionRate': 50,
    'matchmaking.expansionIntervalMs': 10000,
    'matchmaking.maxWaitMs': 120000,
    'matchmaking.tickIntervalMs': 999999,
  };
  return {
    get: (key: string, def?: any) => overrides[key] ?? defaults[key] ?? def,
  } as any;
}

function makeEntry(userId: string, elo: number, mode = GameMode.RANKED, race = Race.HUMAN): QueueEntry {
  return {
    userId,
    socketId: `socket-${userId}`,
    elo,
    gamesPlayed: 20,
    race,
    mode,
    queuedAt: Date.now(),
  };
}

async function buildService(configOverrides: Record<string, any> = {}): Promise<{
  svc: MatchmakingService;
  redis: FakeRedis;
  emitter: EventEmitter2;
}> {
  const redis = new FakeRedis();
  const emitter = new EventEmitter2();
  const svc = new MatchmakingService(new EloService(), makeConfig(configOverrides), emitter);
  (svc as any).redis = redis;
  return { svc, redis, emitter };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MatchmakingService', () => {
  describe('joinQueue / isInQueue / leaveQueue', () => {
    it('adds player to queue', async () => {
      const { svc } = await buildService();
      const entry = makeEntry('u1', 1000);
      await svc.joinQueue(entry);
      expect(await svc.isInQueue('u1', GameMode.RANKED)).toBe(true);
    });

    it('returns false for player not in queue', async () => {
      const { svc } = await buildService();
      expect(await svc.isInQueue('unknown', GameMode.RANKED)).toBe(false);
    });

    it('removes player from specific mode', async () => {
      const { svc } = await buildService();
      await svc.joinQueue(makeEntry('u1', 1000, GameMode.RANKED));
      await svc.joinQueue(makeEntry('u1', 1000, GameMode.CASUAL));
      await svc.leaveQueue('u1', GameMode.RANKED);
      expect(await svc.isInQueue('u1', GameMode.RANKED)).toBe(false);
      expect(await svc.isInQueue('u1', GameMode.CASUAL)).toBe(true);
    });

    it('removes player from all modes when mode is omitted', async () => {
      const { svc } = await buildService();
      await svc.joinQueue(makeEntry('u1', 1000, GameMode.RANKED));
      await svc.joinQueue(makeEntry('u1', 1000, GameMode.CASUAL));
      await svc.leaveQueue('u1');
      expect(await svc.isInQueue('u1', GameMode.RANKED)).toBe(false);
      expect(await svc.isInQueue('u1', GameMode.CASUAL)).toBe(false);
    });
  });

  describe('getQueueStats', () => {
    it('returns 0 for empty queue', async () => {
      const { svc } = await buildService();
      const stats = await svc.getQueueStats(GameMode.RANKED);
      expect(stats.count).toBe(0);
    });

    it('counts players correctly', async () => {
      const { svc } = await buildService();
      await svc.joinQueue(makeEntry('u1', 1000));
      await svc.joinQueue(makeEntry('u2', 1100));
      const stats = await svc.getQueueStats(GameMode.RANKED);
      expect(stats.count).toBe(2);
    });
  });

  describe('processQueue — matching', () => {
    it('matches two players within ELO range and emits matchmaking.matched', async () => {
      const { svc, emitter } = await buildService();

      const matched: any[] = [];
      emitter.on('matchmaking.matched', (m) => matched.push(m));

      await svc.joinQueue(makeEntry('u1', 1000));
      await svc.joinQueue(makeEntry('u2', 1050));

      const results = await svc.processQueue(GameMode.RANKED);

      expect(results).toHaveLength(1);
      expect(results[0].player1.userId).toBeDefined();
      expect(results[0].player2.userId).toBeDefined();
      expect(matched).toHaveLength(1);

      // Both players should be removed from the queue
      expect(await svc.isInQueue('u1', GameMode.RANKED)).toBe(false);
      expect(await svc.isInQueue('u2', GameMode.RANKED)).toBe(false);
    });

    it('does not match players outside ELO range', async () => {
      const { svc, emitter } = await buildService({ 'matchmaking.initialEloRange': 50 });

      const matched: any[] = [];
      emitter.on('matchmaking.matched', (m) => matched.push(m));

      await svc.joinQueue(makeEntry('u1', 1000));
      await svc.joinQueue(makeEntry('u2', 1200)); // 200 ELO apart > 50 range

      const results = await svc.processQueue(GameMode.RANKED);

      expect(results).toHaveLength(0);
      expect(matched).toHaveLength(0);
      expect(await svc.isInQueue('u1', GameMode.RANKED)).toBe(true);
      expect(await svc.isInQueue('u2', GameMode.RANKED)).toBe(true);
    });

    it('returns empty when fewer than 2 players are in queue', async () => {
      const { svc } = await buildService();
      await svc.joinQueue(makeEntry('u1', 1000));
      const results = await svc.processQueue(GameMode.RANKED);
      expect(results).toHaveLength(0);
    });

    it('selects the closest ELO opponent', async () => {
      const { svc } = await buildService({ 'matchmaking.initialEloRange': 500 });

      await svc.joinQueue(makeEntry('u1', 1000));
      await svc.joinQueue(makeEntry('u2', 1400)); // 400 away
      await svc.joinQueue(makeEntry('u3', 1080)); // 80 away — should be preferred

      const results = await svc.processQueue(GameMode.RANKED);
      expect(results).toHaveLength(1);

      const match = results[0];
      const ids = [match.player1.userId, match.player2.userId];
      expect(ids).toContain('u1');
      expect(ids).toContain('u3');
    });

    it('expands ELO range as wait time increases', async () => {
      const { svc, emitter } = await buildService({
        'matchmaking.initialEloRange': 50,
        'matchmaking.eloExpansionRate': 100,
        'matchmaking.expansionIntervalMs': 1,
      });

      const matched: any[] = [];
      emitter.on('matchmaking.matched', (m) => matched.push(m));

      const oldEntry = makeEntry('u1', 1000);
      oldEntry.queuedAt = Date.now() - 5; // waited 5ms — triggers expansion
      await svc.joinQueue(oldEntry);
      await svc.joinQueue(makeEntry('u2', 1200)); // 200 ELO apart

      const results = await svc.processQueue(GameMode.RANKED);
      expect(results).toHaveLength(1);
    });

    it('removes timed-out players and emits matchmaking.timeout', async () => {
      const { svc, emitter } = await buildService({ 'matchmaking.maxWaitMs': 1 });

      const timeouts: any[] = [];
      emitter.on('matchmaking.timeout', (e) => timeouts.push(e));

      const entry = makeEntry('u1', 1000);
      entry.queuedAt = Date.now() - 100; // well past 1ms max wait
      await svc.joinQueue(entry);

      await svc.joinQueue(makeEntry('u2', 1000));
      const results = await svc.processQueue(GameMode.RANKED);

      // u1 should be timed out, no match formed
      expect(results).toHaveLength(0);
      expect(timeouts).toHaveLength(1);
      expect(timeouts[0].userId).toBe('u1');
    });
  });
});
