import { LeaderboardService } from '../leaderboard.service';
import { LeaderboardCategory, LeaderboardPeriod } from '../dto/v1-leaderboard-query.dto';

// ── Factories ──────────────────────────────────────────────────────────────────

function makeRedis(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(1),
    zadd: jest.fn().mockResolvedValue(undefined),
    zincrby: jest.fn().mockResolvedValue(10),
    zscore: jest.fn().mockResolvedValue(null),
    zrank: jest.fn().mockResolvedValue(null),
    zrevrangeWithScores: jest.fn().mockResolvedValue([]),
    zcard: jest.fn().mockResolvedValue(0),
    setnx: jest.fn().mockResolvedValue(true),
    incrWithExpire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(60),
    ...overrides,
  };
}

function makeSnapshotRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn(async (v) => ({ ...v })),
    upsert: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let redis: ReturnType<typeof makeRedis>;
  let snapshotRepo: ReturnType<typeof makeSnapshotRepo>;

  beforeEach(() => {
    redis = makeRedis();
    snapshotRepo = makeSnapshotRepo();
    service = new LeaderboardService(redis as any, snapshotRepo as any);
  });

  // ─── getLeaderboardV1 ─────────────────────────────────────────────────────

  describe('getLeaderboardV1 — sıralama listesi', () => {
    it('POWER kategorisinde boş sıralama döndürüyor', async () => {
      const result = await service.getLeaderboardV1(
        LeaderboardCategory.POWER,
        LeaderboardPeriod.WEEKLY,
        1,
        50,
      );

      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('PvP kategorisinde oyuncular sıralı döndürülüyor', async () => {
      const entries = [
        { value: 'player-1', score: 1500 },
        { value: 'player-2', score: 1200 },
        { value: 'player-3', score: 800 },
      ];
      redis.zrevrangeWithScores.mockResolvedValue(entries);
      redis.zcard.mockResolvedValue(3);
      redis.get.mockImplementation(async (key: string) => {
        if (key.startsWith('lb:profile:')) {
          const id = key.split(':').pop()!;
          return JSON.stringify({ name: `Player ${id}`, race: 'insan', portrait_url: '' });
        }
        return null;
      });

      const result = await service.getLeaderboardV1(
        LeaderboardCategory.PVP,
        LeaderboardPeriod.WEEKLY,
        1,
        50,
      );

      expect(result.total).toBe(3);
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[1].rank).toBe(2);
      expect(result.entries[2].rank).toBe(3);
      expect(result.entries[0].score).toBe(1500);
    });

    it('lonca (ALLIANCE) kategorisinde alliance_name profil üzerinden geliyor', async () => {
      redis.zrevrangeWithScores.mockResolvedValue([{ value: 'player-1', score: 5000 }]);
      redis.zcard.mockResolvedValue(1);
      redis.get.mockImplementation(async (key: string) => {
        if (key.startsWith('lb:profile:player-1')) {
          return JSON.stringify({ name: 'Hero', race: 'elf', portrait_url: '', alliance_name: 'Alliance X' });
        }
        return null;
      });

      const result = await service.getLeaderboardV1(
        LeaderboardCategory.ALLIANCE,
        LeaderboardPeriod.SEASONAL,
        1,
        50,
      );

      expect(result.entries[0].alliance_name).toBe('Alliance X');
    });

    it('önbellek varsa Redis zcard/zrevrange çağrılmıyor', async () => {
      const cached = JSON.stringify({
        entries: [],
        total: 0,
        page: 1,
        limit: 50,
      });
      redis.get.mockResolvedValue(cached);

      await service.getLeaderboardV1(
        LeaderboardCategory.POWER,
        LeaderboardPeriod.WEEKLY,
        1,
        50,
      );

      expect(redis.zrevrangeWithScores).not.toHaveBeenCalled();
      expect(redis.zcard).not.toHaveBeenCalled();
    });

    it('sayfalamada ikinci sayfa offset düzgün hesaplanıyor', async () => {
      redis.zrevrangeWithScores.mockResolvedValue([]);
      redis.zcard.mockResolvedValue(60);

      await service.getLeaderboardV1(
        LeaderboardCategory.POWER,
        LeaderboardPeriod.WEEKLY,
        2,
        20,
      );

      expect(redis.zrevrangeWithScores).toHaveBeenCalledWith(
        expect.any(String),
        20,
        39,
      );
    });

    it('score_label K formatında gösteriliyor (1500 → "1.5K")', async () => {
      redis.zrevrangeWithScores.mockResolvedValue([{ value: 'player-1', score: 1500 }]);
      redis.zcard.mockResolvedValue(1);

      const result = await service.getLeaderboardV1(
        LeaderboardCategory.POWER,
        LeaderboardPeriod.WEEKLY,
        1,
        50,
      );

      expect(result.entries[0].score_label).toBe('1.5K');
    });

    it('score_label M formatında gösteriliyor (2000000 → "2.00M")', async () => {
      redis.zrevrangeWithScores.mockResolvedValue([{ value: 'player-1', score: 2_000_000 }]);
      redis.zcard.mockResolvedValue(1);

      const result = await service.getLeaderboardV1(
        LeaderboardCategory.POWER,
        LeaderboardPeriod.WEEKLY,
        1,
        50,
      );

      expect(result.entries[0].score_label).toBe('2.00M');
    });

    it('score_label küçük değerler sayı olarak gösteriliyor (500 → "500")', async () => {
      redis.zrevrangeWithScores.mockResolvedValue([{ value: 'player-1', score: 500 }]);
      redis.zcard.mockResolvedValue(1);

      const result = await service.getLeaderboardV1(
        LeaderboardCategory.POWER,
        LeaderboardPeriod.WEEKLY,
        1,
        50,
      );

      expect(result.entries[0].score_label).toBe('500');
    });

    it('delta_rank önceki dönem anlık görüntüsünden hesaplanıyor', async () => {
      redis.zrevrangeWithScores.mockResolvedValue([{ value: 'player-1', score: 1000 }]);
      redis.zcard.mockResolvedValue(1);
      snapshotRepo.find.mockResolvedValue([
        { userId: 'player-1', rank: 5 },
      ]);

      const result = await service.getLeaderboardV1(
        LeaderboardCategory.PVP,
        LeaderboardPeriod.WEEKLY,
        1,
        50,
      );

      // currentRank = 1, prevRank = 5, deltaRank = 5 - 1 = 4 (pozitif = yükseliş)
      expect(result.entries[0].delta_rank).toBe(4);
    });
  });

  // ─── getMyRankV1 ──────────────────────────────────────────────────────────

  describe('getMyRankV1 — kullanıcı sırası', () => {
    it('sıralamaya girmemiş kullanıcı için rank null döner', async () => {
      redis.zrank.mockResolvedValue(null);
      redis.zscore.mockResolvedValue(null);

      const result = await service.getMyRankV1('user-1', LeaderboardCategory.POWER, LeaderboardPeriod.WEEKLY);

      expect(result.rank).toBeNull();
      expect(result.score).toBe(0);
    });

    it('sıralamadaki kullanıcı için doğru sıra ve puan döner', async () => {
      redis.zrank.mockResolvedValue(3);
      redis.zscore.mockResolvedValue(7500);

      const result = await service.getMyRankV1('user-1', LeaderboardCategory.PVP, LeaderboardPeriod.SEASONAL);

      expect(result.rank).toBe(3);
      expect(result.score).toBe(7500);
      expect(result.score_label).toBe('7.5K');
    });

    it('önbellek varsa Redis çağrısı yapılmıyor', async () => {
      const cached = JSON.stringify({ rank: 2, score: 5000, score_label: '5.0K', delta_rank: 1 });
      redis.get.mockResolvedValue(cached);

      await service.getMyRankV1('user-1', LeaderboardCategory.POWER, LeaderboardPeriod.WEEKLY);

      expect(redis.zrank).not.toHaveBeenCalled();
      expect(redis.zscore).not.toHaveBeenCalled();
    });
  });

  // ─── getPeriodInfo — dönem countdown ──────────────────────────────────────

  describe('getPeriodInfo — dönem sıfırlanma zamanı', () => {
    it('haftalık dönem sıfırlanması gelecekteki bir Pazartesi', () => {
      const result = service.getPeriodInfo(LeaderboardPeriod.WEEKLY);

      const resetDate = new Date(result.reset_at);
      // Pazartesi = 1
      expect(resetDate.getUTCDay()).toBe(1);
      expect(resetDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('mevsimlik dönem sıfırlanması gelecekte', () => {
      const result = service.getPeriodInfo(LeaderboardPeriod.SEASONAL);

      const resetDate = new Date(result.reset_at);
      expect(resetDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('haftalık tip "weekly" olarak döner', () => {
      const result = service.getPeriodInfo(LeaderboardPeriod.WEEKLY);

      expect(result.type).toBe(LeaderboardPeriod.WEEKLY);
    });

    it('mevsimlik tip "seasonal" olarak döner', () => {
      const result = service.getPeriodInfo(LeaderboardPeriod.SEASONAL);

      expect(result.type).toBe(LeaderboardPeriod.SEASONAL);
    });

    it('mevsimlik reset_at 90 günün katı bir zamana denk geliyor', () => {
      const result = service.getPeriodInfo(LeaderboardPeriod.SEASONAL);
      const SEASON_EPOCH = new Date('2026-01-01T00:00:00Z').getTime();

      const resetTime = new Date(result.reset_at).getTime();
      const diff = resetTime - SEASON_EPOCH;
      expect(diff % (90 * 86400000)).toBe(0);
    });
  });

  // ─── upsertUserProfile ────────────────────────────────────────────────────

  describe('upsertUserProfile', () => {
    it('profil Redis\'e kaydediliyor', async () => {
      await service.upsertUserProfile('user-1', {
        name: 'Hero',
        race: 'insan',
        portrait_url: 'https://example.com/p.png',
        alliance_name: 'Iron Fist',
      });

      expect(redis.set).toHaveBeenCalledWith(
        'lb:profile:user-1',
        expect.stringContaining('Hero'),
      );
    });
  });
});
