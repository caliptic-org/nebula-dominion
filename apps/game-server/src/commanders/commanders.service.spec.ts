import { CommandersService } from './commanders.service';
import { COMMANDER_CATALOG } from './commanders.constants';

/**
 * cycle 25 PROG-TIER2-3-EARLY-UNLOCK — TIER 2/3 commanders must be age-gated,
 * not unlocked at game start, and unlockAgeGatedCommanders must release them at
 * the right age.
 */
describe('CommandersService — age-gated unlock', () => {
  describe('catalog invariant', () => {
    it('only BAŞ KOMUTAN commanders start unlocked; every other tier is gated', () => {
      for (const c of COMMANDER_CATALOG) {
        if (c.tier === 'BAŞ KOMUTAN') {
          expect(c.startsUnlocked).toBe(true);
        } else {
          expect(c.startsUnlocked).toBe(false);
        }
      }
      // sanity: exactly one BAŞ KOMUTAN per race (5)
      expect(COMMANDER_CATALOG.filter((c) => c.startsUnlocked).length).toBe(5);
    });
  });

  describe('unlockAgeGatedCommanders', () => {
    function build(race = 'insan') {
      const dataSource = {
        query: jest.fn().mockImplementation((sql: string) =>
          sql.includes('SELECT u.race') ? [{ race }] : [],
        ),
      };
      const svc = new CommandersService({} as any, dataSource as any);
      return { svc, dataSource };
    }

    /** commander ids the service unlocked (INSERT INTO player_commanders calls). */
    const unlockedIds = (dataSource: { query: jest.Mock }) =>
      dataSource.query.mock.calls
        .filter((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO player_commanders'))
        .map((c) => c[1][1])
        .sort();

    it('age 1 → no unlock (returns before any query)', async () => {
      const { svc, dataSource } = build();
      await svc.unlockAgeGatedCommanders('user-1', 1);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('age 2 → unlocks the race TIER 2 commander (insan: chen)', async () => {
      const { svc, dataSource } = build('insan');
      await svc.unlockAgeGatedCommanders('user-1', 2);
      expect(unlockedIds(dataSource)).toEqual(['chen']);
    });

    it('age 3 → unlocks TIER 2 + TIER 3 (insan: chen, reyes)', async () => {
      const { svc, dataSource } = build('insan');
      await svc.unlockAgeGatedCommanders('user-1', 3);
      expect(unlockedIds(dataSource)).toEqual(['chen', 'reyes']);
    });

    it('age 4 → unlocks TIER 2/3/4 (insan: chen, kovacs, reyes)', async () => {
      const { svc, dataSource } = build('insan');
      await svc.unlockAgeGatedCommanders('user-1', 4);
      expect(unlockedIds(dataSource)).toEqual(['chen', 'kovacs', 'reyes']);
    });

    it('accepts the English race alias (human → insan)', async () => {
      const { svc, dataSource } = build('human');
      await svc.unlockAgeGatedCommanders('user-1', 2);
      expect(unlockedIds(dataSource)).toEqual(['chen']);
    });

    it('unknown race → no unlock', async () => {
      const { svc, dataSource } = build('martian');
      await svc.unlockAgeGatedCommanders('user-1', 5);
      expect(unlockedIds(dataSource)).toEqual([]);
    });
  });
});
