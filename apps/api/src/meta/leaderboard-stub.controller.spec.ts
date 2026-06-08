import { LeaderboardStubController } from './leaderboard-stub.controller';

describe('LeaderboardStubController (real rankings)', () => {
  let dataSource: { query: jest.Mock };
  let controller: LeaderboardStubController;

  beforeEach(() => {
    dataSource = { query: jest.fn() };
    controller = new LeaderboardStubController(dataSource as any);
  });

  describe('list — player categories', () => {
    it('maps pvp rows to ranked entries with BE→FE race translation', async () => {
      dataSource.query.mockResolvedValueOnce([
        { id: 'u1', name: 'Alice', race: 'human', score: 1500 },
        { id: 'u2', name: 'Bob', race: 'demon', score: 1400 },
        { id: 'u3', name: 'Cy', race: 'automaton', score: 1300 },
      ]);

      const res = await controller.list('pvp', '20');

      expect(res.category).toBe('pvp');
      expect(res.total).toBe(3);
      expect(res.entries[0]).toEqual({ rank: 1, id: 'u1', name: 'Alice', race: 'insan', score: 1500, allianceTag: '' });
      expect(res.entries[1].race).toBe('seytan'); // demon
      expect(res.entries[2].race).toBe('otomat'); // automaton
      // pvp must filter to ranked players
      expect(dataSource.query.mock.calls[0][0]).toContain('ranked_games > 0');
      expect(dataSource.query.mock.calls[0][0]).toContain('pl.elo');
    });

    it('power ranks by total_xp', async () => {
      dataSource.query.mockResolvedValueOnce([{ id: 'u1', name: 'Alice', race: 'beast', score: 42000 }]);
      const res = await controller.list('power', '10');
      expect(res.category).toBe('power');
      expect(res.entries[0].race).toBe('canavar'); // beast
      expect(res.entries[0].score).toBe(42000);
      expect(dataSource.query.mock.calls[0][0]).toContain('pl.total_xp');
    });

    it('weekly filters to recently-active players', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await controller.list('weekly', '20');
      expect(dataSource.query.mock.calls[0][0]).toContain("INTERVAL '7 days'");
    });

    it('defaults an unknown category to power', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      const res = await controller.list('bogus' as any, '20');
      expect(res.category).toBe('power');
    });

    it('clamps limit into [1,50] and parameterizes it', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await controller.list('pvp', '999');
      expect(dataSource.query.mock.calls[0][1]).toEqual([50]);
    });

    it('falls back to an EMPTY board on query error (never fabricates names)', async () => {
      dataSource.query.mockRejectedValueOnce(new Error('db down'));
      const res = await controller.list('pvp', '20');
      expect(res).toEqual({ category: 'pvp', total: 0, entries: [] });
    });
  });

  describe('list — guild category', () => {
    it('aggregates alliances and surfaces the tag + leader race', async () => {
      dataSource.query.mockResolvedValueOnce([
        { id: 'a1', name: 'Kovan Bilinci', tag: 'KVN', race: 'zerg', score: 90000 },
        { id: 'a2', name: 'Chrome Order', tag: 'OTM', race: 'automaton', score: 70000 },
      ]);

      const res = await controller.list('guild', '20');

      expect(res.category).toBe('guild');
      expect(res.entries[0]).toEqual({ rank: 1, id: 'a1', name: 'Kovan Bilinci', race: 'zerg', score: 90000, allianceTag: 'KVN' });
      expect(res.entries[1].allianceTag).toBe('OTM');
      expect(dataSource.query.mock.calls[0][0]).toContain('FROM alliances');
      expect(dataSource.query.mock.calls[0][0]).toContain('SUM(pl.total_xp)');
    });
  });

  describe('me', () => {
    const req = { user: { id: 'u1', username: 'Alice' } };

    it('returns real elo + ladder rank (count of higher + 1)', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ elo: 1500, ranked_games: 5, name: 'Alice' }])
        .mockResolvedValueOnce([{ higher: 3 }]);

      const res = await controller.me(req);
      expect(res).toEqual({ rank: 4, name: 'Alice', score: 1500 });
    });

    it('rank null when the player has a row but no ranked games', async () => {
      dataSource.query.mockResolvedValueOnce([{ elo: 1000, ranked_games: 0, name: 'Alice' }]);
      const res = await controller.me(req);
      expect(res).toEqual({ rank: null, name: 'Alice', score: 1000 });
      // must NOT run the higher-count query
      expect(dataSource.query).toHaveBeenCalledTimes(1);
    });

    it('baseline 1000 / unranked when no progression row exists', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      const res = await controller.me(req);
      expect(res).toEqual({ rank: null, name: 'Alice', score: 1000 });
    });

    it('degrades to a safe response on error', async () => {
      dataSource.query.mockRejectedValueOnce(new Error('db down'));
      const res = await controller.me(req);
      expect(res).toEqual({ rank: null, name: 'Alice', score: 0 });
    });
  });
});
