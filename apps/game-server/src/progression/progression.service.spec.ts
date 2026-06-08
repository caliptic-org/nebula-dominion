import { ProgressionService } from './progression.service';
import { PRESTIGE_PROD_PER_LEVEL, PRESTIGE_PROD_CAP } from './config/level-config';
import { XpSource } from './config/level-config';

/**
 * FLOW-004 (endgame prestige) — post-max XP feeds a prestige track + a
 * permanent production bonus.
 */
describe('ProgressionService — prestige (FLOW-004)', () => {
  function build(record: any) {
    const playerLevelRepo = {
      findOne: jest.fn().mockResolvedValue(record),
      create: jest.fn((v: any) => v),
      save: jest.fn((v: any) => Promise.resolve(v)),
    };
    const xpTxRepo = { create: jest.fn((v: any) => v), save: jest.fn().mockResolvedValue({}) };
    const eraPackageRepo = { findOne: jest.fn() };
    const dataSource = { query: jest.fn() };
    const emitter = { emit: jest.fn() };
    const svc = new ProgressionService(
      playerLevelRepo as any,
      xpTxRepo as any,
      eraPackageRepo as any,
      dataSource as any,
      emitter as any,
      {} as any,
    );
    return { svc, playerLevelRepo, xpTxRepo, dataSource, emitter };
  }

  describe('getPrestigeProductionBonus', () => {
    it('is 0 at prestige level 0 (normal play — no-op)', async () => {
      const { svc } = build({ prestigeLevel: 0 });
      expect(await svc.getPrestigeProductionBonus('u1')).toBe(0);
    });

    it('scales at PRESTIGE_PROD_PER_LEVEL per level', async () => {
      const { svc } = build({ prestigeLevel: 5 });
      expect(await svc.getPrestigeProductionBonus('u1')).toBeCloseTo(5 * PRESTIGE_PROD_PER_LEVEL, 6);
    });

    it('caps at PRESTIGE_PROD_CAP', async () => {
      const { svc } = build({ prestigeLevel: 100000 });
      expect(await svc.getPrestigeProductionBonus('u1')).toBe(PRESTIGE_PROD_CAP);
    });
  });

  describe('awardXp at max level → prestige', () => {
    const maxRecord = () => ({
      userId: 'u1',
      currentLevel: 54,
      currentAge: 6,
      currentTier: 9,
      currentXp: 0,
      totalXp: 1_000_000,
      prestigeLevel: 0,
      prestigeXp: 0,
      unlockedContent: [],
    });

    it('accrues into prestige_xp via one atomic cascade UPDATE (no level-up under threshold)', async () => {
      const { svc, dataSource, emitter } = build(maxRecord());
      // atomic UPDATE returns the post-cascade row — still level 0, remainder 300.
      dataSource.query.mockResolvedValueOnce([{ prestige_level: 0, prestige_xp: 300 }]);

      const res = await svc.awardXp({ userId: 'u1', source: XpSource.PVE_WIN, referenceId: 'r1' });

      expect(res.leveledUp).toBe(false);
      // single atomic UPDATE: level += whole-levels, xp = remainder (no 2nd write)
      expect(dataSource.query).toHaveBeenCalledTimes(1);
      expect(dataSource.query.mock.calls[0][0]).toContain('prestige_level = prestige_level +');
      expect(emitter.emit).not.toHaveBeenCalledWith('progression.prestige_up', expect.anything());
    });

    it('grants a prestige level + emits prestige_up when the cascade banks a level', async () => {
      const { svc, dataSource, emitter } = build(maxRecord());
      // atomic UPDATE already cascaded: new level 1, remainder 300.
      dataSource.query.mockResolvedValueOnce([{ prestige_level: 1, prestige_xp: 300 }]);

      const res = await svc.awardXp({ userId: 'u1', source: XpSource.PVE_WIN, referenceId: 'r2' });

      expect(res.leveledUp).toBe(true);
      expect(dataSource.query).toHaveBeenCalledTimes(1);
      expect(emitter.emit).toHaveBeenCalledWith('progression.prestige_up', { userId: 'u1', prestigeLevel: 1 });
    });

    it('is idempotent — a duplicate referenceId (23505) does not re-accrue', async () => {
      const { svc, xpTxRepo, dataSource } = build(maxRecord());
      const dup = Object.assign(new Error('dup'), { code: '23505' });
      // QueryFailedError shape: instanceof check uses the real class; emulate via name.
      Object.setPrototypeOf(dup, Object.getPrototypeOf(new (require('typeorm').QueryFailedError)('q', [], dup)));
      xpTxRepo.save.mockRejectedValueOnce(dup);

      const res = await svc.awardXp({ userId: 'u1', source: XpSource.PVE_WIN, referenceId: 'r1' });

      expect(res.leveledUp).toBe(false);
      // no prestige UPDATE ran (the dup short-circuits before the atomic bump)
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });
});
