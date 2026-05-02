/**
 * Compliance tests: Age 1 unit type seed data against the design document (CAL-103).
 *
 * Verifies Human and Zerg Age 1 unit stats, training costs, and population costs
 * match the documented balance sheet exactly.
 */
import { AGE_1_UNIT_TYPES } from '../seed/unit-types.seed';
import { Race } from '../entities/unit-type.entity';

describe('[Compliance] Age 1 Unit Types — Design Document (CAL-103)', () => {
  const humanUnits = AGE_1_UNIT_TYPES.filter(u => u.race === Race.HUMAN);
  const zergUnits  = AGE_1_UNIT_TYPES.filter(u => u.race === Race.ZERG);

  // ── Roster completeness ────────────────────────────────────────────────────

  describe('roster completeness', () => {
    it('Age 1 contains exactly 18 units (9 Human + 9 Zerg)', () => {
      expect(AGE_1_UNIT_TYPES).toHaveLength(18);
    });

    it('Human race has exactly 9 units', () => {
      expect(humanUnits).toHaveLength(9);
    });

    it('Zerg race has exactly 9 units', () => {
      expect(zergUnits).toHaveLength(9);
    });

    it('all units belong to age 1', () => {
      AGE_1_UNIT_TYPES.forEach(u => expect(u.ageNumber).toBe(1));
    });

    it('unit codes are globally unique', () => {
      const codes = AGE_1_UNIT_TYPES.map(u => u.code);
      expect(new Set(codes).size).toBe(18);
    });
  });

  // ── Tier assignment ────────────────────────────────────────────────────────

  describe('tier assignment', () => {
    it('Human globalTier spans 1–9 without gaps', () => {
      const tiers = humanUnits.map(u => u.globalTier).sort((a, b) => a - b);
      expect(tiers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('Zerg globalTier spans 1–9 without gaps', () => {
      const tiers = zergUnits.map(u => u.globalTier).sort((a, b) => a - b);
      expect(tiers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('Human tierLevel equals globalTier for Age 1', () => {
      humanUnits.forEach(u => expect(u.tierLevel).toBe(u.globalTier));
    });

    it('Zerg tierLevel equals globalTier for Age 1', () => {
      zergUnits.forEach(u => expect(u.tierLevel).toBe(u.globalTier));
    });
  });

  // ── Human unit stats ───────────────────────────────────────────────────────

  describe('Human unit stats (design document values)', () => {
    const h = (code: string) => humanUnits.find(u => u.code === code)!;

    it('human_recruit — HP=80 ATK=12 DEF=5 SPD=6 | min=50 eng=10 pop=1 time=30s', () => {
      const u = h('human_recruit');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(80);
      expect(u.baseAttack).toBe(12);
      expect(u.baseDefense).toBe(5);
      expect(u.baseSpeed).toBe(6);
      expect(u.mineralCost).toBe(50);
      expect(u.energyCost).toBe(10);
      expect(u.populationCost).toBe(1);
      expect(u.trainingTimeSeconds).toBe(30);
    });

    it('human_soldier — HP=120 ATK=20 DEF=10 SPD=5 | min=100 eng=20 pop=1 time=60s', () => {
      const u = h('human_soldier');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(120);
      expect(u.baseAttack).toBe(20);
      expect(u.baseDefense).toBe(10);
      expect(u.baseSpeed).toBe(5);
      expect(u.mineralCost).toBe(100);
      expect(u.energyCost).toBe(20);
      expect(u.populationCost).toBe(1);
      expect(u.trainingTimeSeconds).toBe(60);
    });

    it('human_armored — HP=200 ATK=18 DEF=28 SPD=3 | min=150 eng=30 pop=2 time=90s', () => {
      const u = h('human_armored');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(200);
      expect(u.baseAttack).toBe(18);
      expect(u.baseDefense).toBe(28);
      expect(u.baseSpeed).toBe(3);
      expect(u.mineralCost).toBe(150);
      expect(u.energyCost).toBe(30);
      expect(u.populationCost).toBe(2);
      expect(u.trainingTimeSeconds).toBe(90);
    });

    it('human_engineer — HP=100 ATK=15 DEF=15 SPD=5 | min=120 eng=40 pop=1 time=120s', () => {
      const u = h('human_engineer');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(100);
      expect(u.baseAttack).toBe(15);
      expect(u.baseDefense).toBe(15);
      expect(u.baseSpeed).toBe(5);
      expect(u.mineralCost).toBe(120);
      expect(u.energyCost).toBe(40);
      expect(u.populationCost).toBe(1);
      expect(u.trainingTimeSeconds).toBe(120);
    });

    it('human_marksman — HP=90 ATK=32 DEF=8 SPD=6 | min=180 eng=50 pop=1 time=150s', () => {
      const u = h('human_marksman');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(90);
      expect(u.baseAttack).toBe(32);
      expect(u.baseDefense).toBe(8);
      expect(u.baseSpeed).toBe(6);
      expect(u.mineralCost).toBe(180);
      expect(u.energyCost).toBe(50);
      expect(u.populationCost).toBe(1);
      expect(u.trainingTimeSeconds).toBe(150);
    });

    it('human_scout — HP=100 ATK=22 DEF=12 SPD=9 | min=160 eng=40 pop=1 time=120s', () => {
      const u = h('human_scout');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(100);
      expect(u.baseAttack).toBe(22);
      expect(u.baseDefense).toBe(12);
      expect(u.baseSpeed).toBe(9);
      expect(u.mineralCost).toBe(160);
      expect(u.energyCost).toBe(40);
      expect(u.populationCost).toBe(1);
      expect(u.trainingTimeSeconds).toBe(120);
    });

    it('human_heavy_trooper — HP=260 ATK=28 DEF=32 SPD=3 | min=220 eng=60 pop=2 time=180s', () => {
      const u = h('human_heavy_trooper');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(260);
      expect(u.baseAttack).toBe(28);
      expect(u.baseDefense).toBe(32);
      expect(u.baseSpeed).toBe(3);
      expect(u.mineralCost).toBe(220);
      expect(u.energyCost).toBe(60);
      expect(u.populationCost).toBe(2);
      expect(u.trainingTimeSeconds).toBe(180);
    });

    it('human_sniper — HP=80 ATK=48 DEF=5 SPD=7 | min=300 eng=80 pop=1 time=240s', () => {
      const u = h('human_sniper');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(80);
      expect(u.baseAttack).toBe(48);
      expect(u.baseDefense).toBe(5);
      expect(u.baseSpeed).toBe(7);
      expect(u.mineralCost).toBe(300);
      expect(u.energyCost).toBe(80);
      expect(u.populationCost).toBe(1);
      expect(u.trainingTimeSeconds).toBe(240);
    });

    it('human_commander — HP=300 ATK=38 DEF=38 SPD=5 | min=400 eng=100 pop=3 time=300s', () => {
      const u = h('human_commander');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(300);
      expect(u.baseAttack).toBe(38);
      expect(u.baseDefense).toBe(38);
      expect(u.baseSpeed).toBe(5);
      expect(u.mineralCost).toBe(400);
      expect(u.energyCost).toBe(100);
      expect(u.populationCost).toBe(3);
      expect(u.trainingTimeSeconds).toBe(300);
    });
  });

  // ── Zerg unit stats ────────────────────────────────────────────────────────

  describe('Zerg unit stats (design document values)', () => {
    const z = (code: string) => zergUnits.find(u => u.code === code)!;

    it('zerg_larva — HP=60 ATK=8 DEF=3 SPD=5 | min=30 eng=5 pop=1 time=15s', () => {
      const u = z('zerg_larva');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(60);
      expect(u.baseAttack).toBe(8);
      expect(u.baseDefense).toBe(3);
      expect(u.baseSpeed).toBe(5);
      expect(u.mineralCost).toBe(30);
      expect(u.energyCost).toBe(5);
      expect(u.populationCost).toBe(1);
      expect(u.trainingTimeSeconds).toBe(15);
    });

    it('zerg_zergling — HP=80 ATK=16 DEF=5 SPD=8 | min=60 eng=10 pop=1 time=45s', () => {
      const u = z('zerg_zergling');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(80);
      expect(u.baseAttack).toBe(16);
      expect(u.baseDefense).toBe(5);
      expect(u.baseSpeed).toBe(8);
      expect(u.mineralCost).toBe(60);
      expect(u.energyCost).toBe(10);
      expect(u.populationCost).toBe(1);
      expect(u.trainingTimeSeconds).toBe(45);
    });

    it('zerg_guardian — HP=180 ATK=14 DEF=24 SPD=4 | min=120 eng=25 pop=2 time=80s', () => {
      const u = z('zerg_guardian');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(180);
      expect(u.baseAttack).toBe(14);
      expect(u.baseDefense).toBe(24);
      expect(u.baseSpeed).toBe(4);
      expect(u.mineralCost).toBe(120);
      expect(u.energyCost).toBe(25);
      expect(u.populationCost).toBe(2);
      expect(u.trainingTimeSeconds).toBe(80);
    });

    it('zerg_warrior — HP=150 ATK=26 DEF=15 SPD=6 | min=140 eng=35 pop=2 time=100s', () => {
      const u = z('zerg_warrior');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(150);
      expect(u.baseAttack).toBe(26);
      expect(u.baseDefense).toBe(15);
      expect(u.baseSpeed).toBe(6);
      expect(u.mineralCost).toBe(140);
      expect(u.energyCost).toBe(35);
      expect(u.populationCost).toBe(2);
      expect(u.trainingTimeSeconds).toBe(100);
    });

    it('zerg_creeper — HP=120 ATK=30 DEF=10 SPD=7 | min=160 eng=40 pop=1 time=120s', () => {
      const u = z('zerg_creeper');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(120);
      expect(u.baseAttack).toBe(30);
      expect(u.baseDefense).toBe(10);
      expect(u.baseSpeed).toBe(7);
      expect(u.mineralCost).toBe(160);
      expect(u.energyCost).toBe(40);
      expect(u.populationCost).toBe(1);
      expect(u.trainingTimeSeconds).toBe(120);
    });

    it('zerg_stalker — HP=130 ATK=34 DEF=12 SPD=8 | min=200 eng=50 pop=2 time=150s', () => {
      const u = z('zerg_stalker');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(130);
      expect(u.baseAttack).toBe(34);
      expect(u.baseDefense).toBe(12);
      expect(u.baseSpeed).toBe(8);
      expect(u.mineralCost).toBe(200);
      expect(u.energyCost).toBe(50);
      expect(u.populationCost).toBe(2);
      expect(u.trainingTimeSeconds).toBe(150);
    });

    it('zerg_bone_guard — HP=220 ATK=28 DEF=30 SPD=4 | min=250 eng=65 pop=3 time=180s', () => {
      const u = z('zerg_bone_guard');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(220);
      expect(u.baseAttack).toBe(28);
      expect(u.baseDefense).toBe(30);
      expect(u.baseSpeed).toBe(4);
      expect(u.mineralCost).toBe(250);
      expect(u.energyCost).toBe(65);
      expect(u.populationCost).toBe(3);
      expect(u.trainingTimeSeconds).toBe(180);
    });

    it('zerg_spore_drone — HP=100 ATK=42 DEF=8 SPD=9 | min=280 eng=75 pop=1 time=210s', () => {
      const u = z('zerg_spore_drone');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(100);
      expect(u.baseAttack).toBe(42);
      expect(u.baseDefense).toBe(8);
      expect(u.baseSpeed).toBe(9);
      expect(u.mineralCost).toBe(280);
      expect(u.energyCost).toBe(75);
      expect(u.populationCost).toBe(1);
      expect(u.trainingTimeSeconds).toBe(210);
    });

    it('zerg_hive_lord — HP=350 ATK=42 DEF=34 SPD=5 | min=380 eng=95 pop=3 time=280s', () => {
      const u = z('zerg_hive_lord');
      expect(u).toBeDefined();
      expect(u.baseHp).toBe(350);
      expect(u.baseAttack).toBe(42);
      expect(u.baseDefense).toBe(34);
      expect(u.baseSpeed).toBe(5);
      expect(u.mineralCost).toBe(380);
      expect(u.energyCost).toBe(95);
      expect(u.populationCost).toBe(3);
      expect(u.trainingTimeSeconds).toBe(280);
    });
  });

  // ── Zerg vs Human balance ─────────────────────────────────────────────────

  describe('Zerg vs Human balance (swarm vs. tech strategy)', () => {
    it('Zerg tier-1 (Larva) is cheaper than Human tier-1 (Recruit)', () => {
      const larva   = zergUnits.find(u => u.tierLevel === 1)!;
      const recruit = humanUnits.find(u => u.tierLevel === 1)!;
      expect(larva.mineralCost).toBeLessThan(recruit.mineralCost);
      expect(larva.energyCost).toBeLessThan(recruit.energyCost);
    });

    it('Zerg tier-1 trains faster than Human tier-1 (swarm faster to field)', () => {
      const larva   = zergUnits.find(u => u.tierLevel === 1)!;
      const recruit = humanUnits.find(u => u.tierLevel === 1)!;
      expect(larva.trainingTimeSeconds).toBeLessThan(recruit.trainingTimeSeconds);
    });

    it('Zerg apex (Hive Lord, tier 9) has higher HP than Human apex (Commander, tier 9)', () => {
      const hiveLord  = zergUnits.find(u => u.tierLevel === 9)!;
      const commander = humanUnits.find(u => u.tierLevel === 9)!;
      expect(hiveLord.baseHp).toBeGreaterThan(commander.baseHp);
    });

    it('Human Commander (tier 9) has balanced ATK≈DEF (all-round design)', () => {
      const commander = humanUnits.find(u => u.tierLevel === 9)!;
      expect(commander.baseAttack).toBe(commander.baseDefense);
    });

    it('Human Sniper (tier 8) has highest attack in Human Age 1 roster', () => {
      const sniper = humanUnits.find(u => u.code === 'human_sniper')!;
      const maxAtk  = Math.max(...humanUnits.map(u => u.baseAttack));
      expect(sniper.baseAttack).toBe(maxAtk);
    });

    it('Zerg Hive Lord (tier 9) has highest HP in Zerg Age 1 roster', () => {
      const hiveLord = zergUnits.find(u => u.code === 'zerg_hive_lord')!;
      const maxHp    = Math.max(...zergUnits.map(u => u.baseHp));
      expect(hiveLord.baseHp).toBe(maxHp);
    });
  });

  // ── Zerg cost scaling (strictly increasing by tier) ───────────────────────

  describe('Zerg resource cost scaling', () => {
    it('Zerg mineral costs strictly increase with tier level', () => {
      const sorted = [...zergUnits].sort((a, b) => a.tierLevel - b.tierLevel);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].mineralCost).toBeGreaterThan(sorted[i - 1].mineralCost);
      }
    });

    it('Zerg energy costs strictly increase with tier level', () => {
      const sorted = [...zergUnits].sort((a, b) => a.tierLevel - b.tierLevel);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].energyCost).toBeGreaterThan(sorted[i - 1].energyCost);
      }
    });

    it('Zerg training time strictly increases with tier level', () => {
      const sorted = [...zergUnits].sort((a, b) => a.tierLevel - b.tierLevel);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].trainingTimeSeconds).toBeGreaterThan(sorted[i - 1].trainingTimeSeconds);
      }
    });
  });

  // ── Population cost constraints ───────────────────────────────────────────

  describe('population cost constraints', () => {
    it('all units have population cost ≥ 1', () => {
      AGE_1_UNIT_TYPES.forEach(u => expect(u.populationCost).toBeGreaterThanOrEqual(1));
    });

    it('heavy/tank units cost 2+ population (pop management)', () => {
      const heavyUnits = AGE_1_UNIT_TYPES.filter(u => u.populationCost >= 2);
      expect(heavyUnits.length).toBeGreaterThan(0);
    });

    it('apex units (tier 9) cost 3 population', () => {
      const apexUnits = AGE_1_UNIT_TYPES.filter(u => u.tierLevel === 9);
      apexUnits.forEach(u => expect(u.populationCost).toBe(3));
    });
  });
});
