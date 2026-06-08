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

describe('CommandersService — getActivePowerMultiplier (COMBAT-QUICKBATTLE-POWER-FIX)', () => {
  function buildWithActive(active: { commanderId: string; level: number } | null) {
    const playerCommanderRepo = { findOne: jest.fn().mockResolvedValue(active) };
    return new CommandersService(playerCommanderRepo as any, { query: jest.fn() } as any);
  }

  it('returns 1.0 when no commander is active', async () => {
    expect(await buildWithActive(null).getActivePowerMultiplier('u1')).toBe(1);
  });

  it('sums level-scaled combat bonuses (voss L1: +12 dmg +10 hp +8 def → 1.30)', async () => {
    const m = await buildWithActive({ commanderId: 'voss', level: 1 }).getActivePowerMultiplier('u1');
    expect(m).toBeCloseTo(1.3, 5);
  });

  it('a net-positive glass cannon still boosts (kovacs L1: +15 dmg -10 def → 1.05)', async () => {
    const m = await buildWithActive({ commanderId: 'kovacs', level: 1 }).getActivePowerMultiplier('u1');
    expect(m).toBeCloseTo(1.05, 5);
  });

  it('scales up with commander level (voss L10 > voss L1)', async () => {
    const l1 = await buildWithActive({ commanderId: 'voss', level: 1 }).getActivePowerMultiplier('u1');
    const l10 = await buildWithActive({ commanderId: 'voss', level: 10 }).getActivePowerMultiplier('u1');
    expect(l10).toBeGreaterThan(l1);
  });

  it('a pure-economy commander (no combat bonus) is neutral 1.0 (chen)', async () => {
    const m = await buildWithActive({ commanderId: 'chen', level: 5 }).getActivePowerMultiplier('u1');
    expect(m).toBe(1);
  });
});
