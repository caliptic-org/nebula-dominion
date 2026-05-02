import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResourcesService } from './resources.service';
import { Resource } from './entities/resource.entity';
import { REDIS_CLIENT } from '../database/redis.provider';

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

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'r1',
    playerId: 'p1',
    mineral: 100,
    gas: 50,
    energy: 100,
    mineralCap: 5000,
    gasCap: 2000,
    energyCap: 500,
    mineralPerTick: 10,
    gasPerTick: 5,
    energyPerTick: 8,
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

      expect(resource.mineral).toBe(150);
      expect(resource.gas).toBe(80);
      expect(resource.energy).toBe(120);
      expect(repo.save).toHaveBeenCalledWith(resource);
    });

    it('throws when insufficient resources', async () => {
      repo.findOne.mockResolvedValue(makeResource({ mineral: 10 }));
      await expect(service.deduct('p1', { mineral: 50, gas: 0, energy: 0 })).rejects.toThrow();
    });
  });

  describe('applyTick', () => {
    it('adds per-tick production and respects caps', async () => {
      const resource = makeResource({ mineral: 4990, mineralCap: 5000, mineralPerTick: 20 });
      repo.findOne.mockResolvedValue(resource);
      repo.save.mockResolvedValue(resource);

      await service.applyTick('p1');

      expect(resource.mineral).toBe(5000); // capped at mineralCap
      expect(resource.lastTickAt).toBeInstanceOf(Date);
    });

    it('adds gas and energy normally within caps', async () => {
      const resource = makeResource({ gas: 50, gasPerTick: 10, energy: 80, energyPerTick: 15 });
      repo.findOne.mockResolvedValue(resource);
      repo.save.mockResolvedValue(resource);

      await service.applyTick('p1');

      expect(resource.gas).toBe(60);
      expect(resource.energy).toBe(95);
    });
  });
});
