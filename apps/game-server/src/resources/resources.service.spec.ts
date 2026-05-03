import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResourcesService } from './resources.service';
import { Resource } from './entities/resource.entity';
import { REDIS_CLIENT } from '../database/redis.provider';
import { EconomyService } from '../economy/economy.service';

const mockResourceRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockRedis = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
});

const mockEconomyService = () => ({
  computeStorageCap: jest.fn().mockResolvedValue(0),
});

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'r1',
    playerId: 'p1',
    mineral: 100,
    gas: 50,
    energy: 100,
    population: 0,
    mineralCap: 24000,
    gasCap: 14400,
    energyCap: 8400,
    populationCap: 5000,
    mineralPerTick: 10,
    gasPerTick: 5,
    energyPerTick: 8,
    populationPerTick: 0,
    lastTickAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Resource;
}

describe('ResourcesService', () => {
  let service: ResourcesService;
  let repo: ReturnType<typeof mockResourceRepo>;
  let redis: ReturnType<typeof mockRedis>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: getRepositoryToken(Resource), useFactory: mockResourceRepo },
        { provide: REDIS_CLIENT, useFactory: mockRedis },
        { provide: EconomyService, useFactory: mockEconomyService },
      ],
    }).compile();

    service = module.get(ResourcesService);
    repo = module.get(getRepositoryToken(Resource));
    redis = module.get(REDIS_CLIENT);
  });

  describe('canAfford', () => {
    it('returns true when player has enough', async () => {
      repo.findOne.mockResolvedValue(makeResource({ mineral: 200, gas: 100, energy: 150 }));
      const result = await service.canAfford('p1', { mineral: 50, gas: 0, energy: 20 });
      expect(result).toBe(true);
    });

    it('returns false when mineral is short', async () => {
      repo.findOne.mockResolvedValue(makeResource({ mineral: 10 }));
      const result = await service.canAfford('p1', { mineral: 50, gas: 0, energy: 0 });
      expect(result).toBe(false);
    });
  });

  describe('deduct', () => {
    it('deducts resources and saves', async () => {
      const resource = makeResource({ mineral: 200, gas: 100, energy: 150 });
      repo.findOne.mockResolvedValue(resource);
      repo.save.mockResolvedValue(resource);

      await service.deduct('p1', { mineral: 50, gas: 20, energy: 30 });

      expect(Number(resource.mineral)).toBe(150);
      expect(Number(resource.gas)).toBe(80);
      expect(Number(resource.energy)).toBe(120);
      expect(repo.save).toHaveBeenCalledWith(resource);
    });

    it('throws when insufficient resources', async () => {
      repo.findOne.mockResolvedValue(makeResource({ mineral: 10 }));
      await expect(service.deduct('p1', { mineral: 50, gas: 0, energy: 0 })).rejects.toThrow();
    });
  });

  describe('applyTick', () => {
    it('adds per-tick production and respects caps', async () => {
      const resource = makeResource({ mineral: 23990, mineralCap: 24000, mineralPerTick: 20 });
      repo.findOne.mockResolvedValue(resource);
      repo.save.mockResolvedValue(resource);

      await service.applyTick('p1');

      expect(Number(resource.mineral)).toBe(24000); // capped at mineralCap
      expect(resource.lastTickAt).toBeInstanceOf(Date);
    });

    it('adds gas and energy normally within caps', async () => {
      const resource = makeResource({ gas: 50, gasPerTick: 10, energy: 80, energyPerTick: 15 });
      repo.findOne.mockResolvedValue(resource);
      repo.save.mockResolvedValue(resource);

      await service.applyTick('p1');

      expect(Number(resource.gas)).toBe(60);
      expect(Number(resource.energy)).toBe(95);
    });
  });

  describe('applyOfflineAccumulation', () => {
    const TICK_MS = 30_000;

    it('applies 8h of missed ticks and stays under cap', async () => {
      const eightHoursAgo = new Date(Date.now() - 8 * 3600 * 1000);
      // 1000/hr ÷ 120 ticks/hr = 8.333/tick
      const perTick = 1000 / 120;
      const resource = makeResource({
        mineral: 0,
        mineralCap: 24000,
        mineralPerTick: perTick,
        lastTickAt: eightHoursAgo,
      });
      repo.findOne.mockResolvedValue(resource);
      repo.save.mockResolvedValue(resource);

      const snap = await service.applyOfflineAccumulation('p1');

      expect(snap.mineral).toBe(8000);
      expect(snap.mineral).toBeLessThan(snap.mineralCap);
    });

    it('24h offline → hits exactly the mineral cap', async () => {
      const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
      const perTick = 1000 / 120;
      const resource = makeResource({
        mineral: 0,
        mineralCap: 24000,
        mineralPerTick: perTick,
        lastTickAt: dayAgo,
      });
      repo.findOne.mockResolvedValue(resource);
      repo.save.mockResolvedValue(resource);

      const snap = await service.applyOfflineAccumulation('p1');

      expect(snap.mineral).toBe(24000);
    });

    it('48h offline → still capped (no loss)', async () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000);
      const perTick = 1000 / 120;
      const resource = makeResource({
        mineral: 0,
        mineralCap: 24000,
        mineralPerTick: perTick,
        lastTickAt: twoDaysAgo,
      });
      repo.findOne.mockResolvedValue(resource);
      repo.save.mockResolvedValue(resource);

      const snap = await service.applyOfflineAccumulation('p1');

      expect(snap.mineral).toBe(24000);
    });

    it('advances lastTickAt by full ticks applied, not to now', async () => {
      const twoTicksAgo = new Date(Date.now() - 2 * TICK_MS - 100);
      const resource = makeResource({
        mineral: 0,
        mineralCap: 24000,
        mineralPerTick: 10,
        lastTickAt: twoTicksAgo,
      });
      repo.findOne.mockResolvedValue(resource);
      repo.save.mockResolvedValue(resource);

      await service.applyOfflineAccumulation('p1');

      const savedResource: Resource = repo.save.mock.calls[0][0];
      const expectedLastTick = new Date(twoTicksAgo.getTime() + 2 * TICK_MS);
      expect(savedResource.lastTickAt!.getTime()).toBe(expectedLastTick.getTime());
    });

    it('sets lastTickAt when null (new player)', async () => {
      const resource = makeResource({ lastTickAt: null });
      repo.findOne.mockResolvedValue(resource);
      repo.save.mockResolvedValue(resource);

      await service.applyOfflineAccumulation('p1');

      expect(repo.save).toHaveBeenCalled();
      const savedResource: Resource = repo.save.mock.calls[0][0];
      expect(savedResource.lastTickAt).toBeInstanceOf(Date);
    });
  });
});
