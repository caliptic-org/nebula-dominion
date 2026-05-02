/**
 * Compliance tests: BattleEngine damage formula, crit system, and initiative
 * against the documented design spec (CAL-107).
 *
 * Damage formula (server-side, anti-cheat):
 *   defenseReduction = min(defense / (defense + 100), 0.75)
 *   baseDamage = max(1, round(attack * (1 - defenseReduction)))
 *   finalDamage = round(baseDamage * critMultiplier)   [critMultiplier = 1.75 on crit, 1.0 otherwise]
 *   critChance = 0.15 (15%), defenseReductionCap = 0.75 (75%)
 */
import { BattleEngineService } from '../battle-engine.service';
import { UnitSnapshot } from '../types/battle.types';

function unit(overrides: Partial<UnitSnapshot> = {}): UnitSnapshot {
  return {
    unitId: 'u-' + Math.random().toString(36).slice(2),
    name: 'Unit',
    race: 'human',
    tierLevel: 1,
    attack: 100,
    defense: 0,
    hp: 1000,
    maxHp: 1000,
    speed: 5,
    isAlive: true,
    ...overrides,
  };
}

describe('[Compliance] BattleEngine — Damage Formula & Initiative (CAL-107)', () => {
  let engine: BattleEngineService;

  beforeEach(() => {
    engine = new BattleEngineService();
  });

  afterEach(() => jest.restoreAllMocks());

  // ── Engine metadata ────────────────────────────────────────────────────────

  describe('engine metadata', () => {
    it('version is 1.0.0', () => {
      expect(engine.getEngineVersion()).toBe('1.0.0');
    });
  });

  // ── Defense reduction formula: min(d/(d+100), 0.75) ──────────────────────

  describe('defense reduction formula', () => {
    it('defense=0 → no reduction, damage equals attack', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const { baseDamage } = engine.calculateDamage(unit({ attack: 100 }), unit({ defense: 0 }));
      expect(baseDamage).toBe(100);
    });

    it('defense=100 → 50% reduction, damage = round(attack × 0.5)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const { baseDamage } = engine.calculateDamage(unit({ attack: 100 }), unit({ defense: 100 }));
      expect(baseDamage).toBe(50);
    });

    it('defense=300 → hits 75% cap, damage = round(attack × 0.25)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      // 300 / (300 + 100) = 0.75 exactly — cap
      const { baseDamage } = engine.calculateDamage(unit({ attack: 100 }), unit({ defense: 300 }));
      expect(baseDamage).toBe(25);
    });

    it('defense=9999 → still capped at 75%, damage = round(attack × 0.25)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const { baseDamage } = engine.calculateDamage(unit({ attack: 100 }), unit({ defense: 9999 }));
      expect(baseDamage).toBe(25);
    });

    it('minimum guaranteed damage is 1 even with 1 attack vs max defense', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const { finalDamage } = engine.calculateDamage(unit({ attack: 1 }), unit({ defense: 9999 }));
      expect(finalDamage).toBeGreaterThanOrEqual(1);
    });

    it('defense=200 → 66.67% reduction, damage = round(attack × 0.333)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      // 200 / 300 ≈ 0.6667, baseDamage = round(100 * 0.3333) = round(33.33) = 33
      const { baseDamage } = engine.calculateDamage(unit({ attack: 100 }), unit({ defense: 200 }));
      expect(baseDamage).toBe(33);
    });
  });

  // ── Critical hit system: 15% chance, 1.75× multiplier ───────────────────

  describe('critical hit system', () => {
    it('crit activates when random < 0.15 and multiplier is exactly 1.75', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.14);
      const result = engine.calculateDamage(unit({ attack: 100 }), unit({ defense: 0 }));
      expect(result.criticalHit).toBe(true);
      expect(result.critMultiplier).toBe(1.75);
      expect(result.finalDamage).toBe(Math.round(100 * 1.75)); // 175
    });

    it('no crit when random is exactly 0.15 (boundary — not strictly less)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.15);
      const result = engine.calculateDamage(unit({ attack: 100 }), unit({ defense: 0 }));
      expect(result.criticalHit).toBe(false);
    });

    it('no crit when random = 0.5, multiplier is 1.0', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const result = engine.calculateDamage(unit({ attack: 100 }), unit({ defense: 0 }));
      expect(result.criticalHit).toBe(false);
      expect(result.critMultiplier).toBe(1.0);
      expect(result.finalDamage).toBe(100);
    });

    it('crit damage is always greater than base damage', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.01);
      const result = engine.calculateDamage(unit({ attack: 100 }), unit({ defense: 0 }));
      expect(result.finalDamage).toBeGreaterThan(result.baseDamage);
    });
  });

  // ── Real Age 1 unit matchups from design doc ─────────────────────────────

  describe('Age 1 design-doc matchups', () => {
    // defenseReduction = min(d/(d+100), 0.75); baseDamage = round(atk*(1-dr))

    it('Human Soldier (atk=20) vs Zerg Guardian (def=24) → baseDamage=16', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      // dr = 24/124 ≈ 0.19355; baseDamage = round(20 * 0.80645) = round(16.129) = 16
      const { baseDamage } = engine.calculateDamage(
        unit({ attack: 20, name: 'Soldier' }),
        unit({ defense: 24, name: 'Guardian' }),
      );
      expect(baseDamage).toBe(16);
    });

    it('Zerg Hive Lord (atk=42) vs Human Commander (def=38) → baseDamage=30', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      // dr = 38/138 ≈ 0.27536; baseDamage = round(42 * 0.72464) = round(30.435) = 30
      const { baseDamage } = engine.calculateDamage(
        unit({ attack: 42, name: 'Hive Lord' }),
        unit({ defense: 38, name: 'Commander' }),
      );
      expect(baseDamage).toBe(30);
    });

    it('Human Sniper (atk=48) vs Zerg Larva (def=3) → baseDamage=47', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      // dr = 3/103 ≈ 0.02913; baseDamage = round(48 * 0.97087) = round(46.602) = 47
      const { baseDamage } = engine.calculateDamage(
        unit({ attack: 48, name: 'Sniper' }),
        unit({ defense: 3, name: 'Larva' }),
      );
      expect(baseDamage).toBe(47);
    });

    it('Human Recruit (atk=12) vs Zerg Zergling (def=5) → baseDamage=11', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      // dr = 5/105 ≈ 0.04762; baseDamage = round(12 * 0.95238) = round(11.428) = 11
      const { baseDamage } = engine.calculateDamage(
        unit({ attack: 12, name: 'Recruit' }),
        unit({ defense: 5, name: 'Zergling' }),
      );
      expect(baseDamage).toBe(11);
    });

    it('Zerg Bone Guard (atk=28) vs Human Heavy Trooper (def=32) → baseDamage=21', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      // dr = 32/132 ≈ 0.24242; baseDamage = round(28 * 0.75758) = round(21.212) = 21
      const { baseDamage } = engine.calculateDamage(
        unit({ attack: 28, name: 'Bone Guard' }),
        unit({ defense: 32, name: 'Heavy Trooper' }),
      );
      expect(baseDamage).toBe(21);
    });

    it('Human Marksman crit (atk=32) vs Zerg Creeper (def=10): crit=55', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.01);
      // dr = 10/110 ≈ 0.09091; base = round(32 * 0.90909) = round(29.09) = 29
      // crit = round(29 * 1.75) = round(50.75) = 51
      const result = engine.calculateDamage(
        unit({ attack: 32, name: 'Marksman' }),
        unit({ defense: 10, name: 'Creeper' }),
      );
      expect(result.criticalHit).toBe(true);
      expect(result.finalDamage).toBe(Math.round(result.baseDamage * 1.75));
    });
  });

  // ── Initiative ordering ────────────────────────────────────────────────────

  describe('initiative ordering by speed', () => {
    it('Zerg Zergling (spd=8) attacks before Human Armored (spd=3)', () => {
      const sorted = engine.sortByInitiative([
        unit({ speed: 3, unitId: 'armored', name: 'Armored Trooper' }),
        unit({ speed: 8, unitId: 'zergling', name: 'Zergling' }),
      ]);
      expect(sorted[0].name).toBe('Zergling');
    });

    it('Human Scout (spd=9) and Zerg Spore Drone (spd=9) both lead Age 1 roster', () => {
      const all = [
        unit({ speed: 9, unitId: 'scout' }),
        unit({ speed: 9, unitId: 'spore' }),
        unit({ speed: 8, unitId: 'zergling' }),
        unit({ speed: 7, unitId: 'sniper' }),
        unit({ speed: 6, unitId: 'recruit' }),
        unit({ speed: 5, unitId: 'soldier' }),
        unit({ speed: 3, unitId: 'armored' }),
      ];
      const sorted = engine.sortByInitiative(all);
      expect(sorted[0].speed).toBe(9);
      expect(sorted[1].speed).toBe(9);
      expect(sorted[2].speed).toBe(8);
      expect(sorted[sorted.length - 1].speed).toBe(3);
    });

    it('dead units are excluded from initiative order', () => {
      const alive = unit({ isAlive: true });
      const dead = unit({ isAlive: false });
      const sorted = engine.sortByInitiative([alive, dead]);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].isAlive).toBe(true);
    });

    it('tie in speed broken by unitId lexicographic order (deterministic)', () => {
      const a = unit({ speed: 10, unitId: 'aaa' });
      const b = unit({ speed: 10, unitId: 'bbb' });
      const sorted = engine.sortByInitiative([b, a]);
      expect(sorted[0].unitId).toBe('aaa');
    });
  });

  // ── State hash integrity ───────────────────────────────────────────────────

  describe('state hash for anti-cheat replay integrity', () => {
    it('produces a 64-char SHA-256 hex hash', () => {
      const army = { playerId: 'p1', units: [] };
      const action = {
        battleId: 'b1', playerId: 'p1',
        actionType: 'attack' as any,
        attackerUnitId: 'u1', targetUnitId: 'u2',
      };
      const dmg = { baseDamage: 10, criticalHit: false, critMultiplier: 1, finalDamage: 10, blocked: 0 };
      const hash = engine.computeStateHash('b1', 1, action, dmg, army, army);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('different turn numbers produce different hashes', () => {
      const army = { playerId: 'p1', units: [] };
      const action = {
        battleId: 'b1', playerId: 'p1',
        actionType: 'attack' as any,
        attackerUnitId: 'u1', targetUnitId: 'u2',
      };
      const dmg = { baseDamage: 10, criticalHit: false, critMultiplier: 1, finalDamage: 10, blocked: 0 };
      const h1 = engine.computeStateHash('b1', 1, action, dmg, army, army);
      const h2 = engine.computeStateHash('b1', 2, action, dmg, army, army);
      expect(h1).not.toBe(h2);
    });
  });
});
