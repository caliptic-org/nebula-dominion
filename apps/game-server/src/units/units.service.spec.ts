import { UnitsService } from './units.service';
import {
  unitSupplyCost,
  UNIT_CONFIGS,
  UnitType,
} from './constants/race-configs.constants';
import { Race } from '../matchmaking/dto/join-queue.dto';
import { BuildingType, BuildingStatus } from '../buildings/entities/building.entity';

/**
 * ECON #6 — population (supply) cap on unit training.
 *
 * population was a dead readout: trainUnit deducted M/G/E but never a supply
 * cost and never checked a cap. These tests pin the new enforcement:
 * supply is derived from build cost, used-supply is summed FRESH from the
 * roster + in-flight queue, training is refused over cap, and a 0 cap
 * fails OPEN (never bricks training).
 */
describe('UnitsService — population cap (ECON #6)', () => {
  /** Chainable query-builder stub whose getRawMany resolves to `rows`. */
  function qb(rows: unknown[]) {
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'addSelect', 'where', 'andWhere', 'groupBy']) {
      b[m] = jest.fn(() => b);
    }
    b.getRawMany = jest.fn(() => Promise.resolve(rows));
    return b;
  }

  function build() {
    const unitRepo = {
      createQueryBuilder: jest.fn(() => qb([])),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue({}),
    };
    const queueRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((v: any) => v),
      save: jest.fn((v: any) => Promise.resolve(v)),
      createQueryBuilder: jest.fn(() => qb([])),
    };
    const buildingRepo = { findOne: jest.fn() };
    const resources = {
      getSnapshot: jest.fn(),
      canAfford: jest.fn().mockResolvedValue(true),
      deduct: jest.fn().mockResolvedValue({}),
      setPopulation: jest.fn().mockResolvedValue(undefined),
    };
    const progression = { awardXp: jest.fn().mockResolvedValue({}) };
    const commanders = { getActiveBonus: jest.fn().mockResolvedValue({}) };
    const dataSource = { query: jest.fn() };
    const svc = new UnitsService(
      unitRepo as any,
      queueRepo as any,
      buildingRepo as any,
      resources as any,
      progression as any,
      commanders as any,
      dataSource as any,
    );
    // Get trainUnit past the building + race gates so the test exercises the
    // population branch specifically. MARINE/BARRACKS/HUMAN is a real
    // trainable combo.
    jest.spyOn(svc as any, 'getPlayerRace').mockResolvedValue(Race.HUMAN);
    buildingRepo.findOne.mockResolvedValue({
      id: 'b1',
      playerId: 'p1',
      type: BuildingType.BARRACKS,
      status: BuildingStatus.ACTIVE,
    });
    return { svc, unitRepo, queueRepo, resources, commanders };
  }

  describe('disbandUnit (supply-release valve)', () => {
    it('removes the unit, re-syncs population, and reports freed supply', async () => {
      const { svc, unitRepo, resources } = build();
      unitRepo.findOne.mockResolvedValue({ id: 'u9', playerId: 'p1', type: UnitType.SIEGE_TANK, isAlive: true });

      const res = await svc.disbandUnit('p1', 'u9');

      expect(unitRepo.remove).toHaveBeenCalled();
      expect(res).toEqual({ disbanded: 'u9', freedSupply: 5 }); // siege tank = 5
      // population recomputed + persisted so the freed slot shows immediately
      expect(resources.setPopulation).toHaveBeenCalledWith('p1', expect.any(Number));
    });

    it('404s when the unit is missing or not the caller’s', async () => {
      const { svc, unitRepo } = build();
      unitRepo.findOne.mockResolvedValue(null);

      await expect(svc.disbandUnit('p1', 'nope')).rejects.toThrow(/bulunamadı/);
      expect(unitRepo.remove).not.toHaveBeenCalled();
    });
  });

  const train = (svc: UnitsService, count = 1) =>
    svc.trainUnit('p1', { unitType: UnitType.MARINE, buildingId: 'b1', count } as any);

  describe('unitSupplyCost', () => {
    it('is 1 for a cheap unit and scales with build cost', () => {
      expect(unitSupplyCost(UNIT_CONFIGS[UnitType.MARINE])).toBe(1); // (50+0)/50
      expect(unitSupplyCost(UNIT_CONFIGS[UnitType.SIEGE_TANK])).toBe(5); // (150+100)/50
    });

    it('never drops below 1', () => {
      expect(unitSupplyCost({ cost: { mineral: 0, gas: 0, energy: 0 } } as any)).toBe(1);
    });
  });

  describe('computePopulationUsed', () => {
    it('sums supply across alive roster + in-flight queue', async () => {
      const { svc, unitRepo, queueRepo } = build();
      // 3 marines alive (3×1) + 2 queued siege tanks (2×5) = 13.
      unitRepo.createQueryBuilder.mockReturnValue(
        qb([{ type: UnitType.MARINE, cnt: '3' }]) as any,
      );
      queueRepo.createQueryBuilder.mockReturnValue(
        qb([{ type: UnitType.SIEGE_TANK, cnt: '2' }]) as any,
      );
      const used = await (svc as any).computePopulationUsed('p1');
      expect(used).toBe(13);
    });
  });

  describe('trainUnit cap enforcement', () => {
    it('refuses training when roster + batch would exceed populationCap', async () => {
      const { svc, resources } = build();
      resources.getSnapshot.mockResolvedValue({ populationCap: 10 });
      jest.spyOn(svc as any, 'computePopulationUsed').mockResolvedValue(10);

      await expect(train(svc, 1)).rejects.toThrow(/Nüfus kapasitesi yetersiz/);
      // capped order must NOT burn resources
      expect(resources.deduct).not.toHaveBeenCalled();
    });

    it('allows training that fits under the cap and reserves the supply', async () => {
      const { svc, resources } = build();
      resources.getSnapshot.mockResolvedValue({ populationCap: 5000 });
      jest.spyOn(svc as any, 'computePopulationUsed').mockResolvedValue(0);

      const entry = await train(svc, 3);
      expect(entry).toMatchObject({ unitType: UnitType.MARINE, count: 3 });
      expect(resources.deduct).toHaveBeenCalled();
      // syncPopulation persisted the new derived value for the HUD
      expect(resources.setPopulation).toHaveBeenCalledWith('p1', expect.any(Number));
    });

    it('fails OPEN — a 0/unset cap never blocks training', async () => {
      const { svc, resources } = build();
      resources.getSnapshot.mockResolvedValue({ populationCap: 0 });
      // even a huge used value must not matter when the cap is disabled
      jest.spyOn(svc as any, 'computePopulationUsed').mockResolvedValue(99999);

      await expect(train(svc, 1)).resolves.toMatchObject({ unitType: UnitType.MARINE });
      expect(resources.deduct).toHaveBeenCalled();
    });
  });
});
