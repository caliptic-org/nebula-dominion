import { BadRequestException, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RedisService } from '../../redis/redis.service';
import { MapActionDto, MapActionType } from '../dto/map-action.dto';
import { MapActionLog } from '../entities/map-action-log.entity';
import { PlayerResources } from '../entities/player-resources.entity';
import { MapService } from '../map.service';

const PLAYER_ID = '00000000-0000-4000-a000-000000000001';

function makeDto(overrides: Partial<MapActionDto> = {}): MapActionDto {
  return Object.assign(new MapActionDto(), {
    playerId:  PLAYER_ID,
    action:    MapActionType.ATTACK,
    targetCol: 3,   // enemy base (zerg-1)
    targetRow: 3,
    ...overrides,
  });
}

describe('MapService', () => {
  let service: MapService;
  let redis: jest.Mocked<RedisService>;
  let resourcesRepo: jest.Mocked<any>;
  let actionLogRepo: jest.Mocked<any>;

  beforeEach(async () => {
    redis = {
      zremrangebyscore: jest.fn().mockResolvedValue(undefined),
      zcard:            jest.fn().mockResolvedValue(0),
      zadd:             jest.fn().mockResolvedValue(undefined),
      expire:           jest.fn().mockResolvedValue(undefined),
    } as any;

    const defaultResources = Object.assign(new PlayerResources(), {
      playerId:      PLAYER_ID,
      mineral:       2400,
      gas:           840,
      energy:        1200,
      population:    12,
      populationCap: 50,
    });

    resourcesRepo = {
      findOne: jest.fn().mockResolvedValue(defaultResources),
      create:  jest.fn((d) => Object.assign(new PlayerResources(), d)),
      save:    jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    actionLogRepo = {
      create: jest.fn((d) => Object.assign(new MapActionLog(), d)),
      save:   jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        { provide: getRepositoryToken(PlayerResources), useValue: resourcesRepo },
        { provide: getRepositoryToken(MapActionLog),    useValue: actionLogRepo },
        { provide: RedisService,                        useValue: redis },
      ],
    }).compile();

    service = module.get<MapService>(MapService);
  });

  // ── getMapState ────────────────────────────────────────────────────────────

  describe('getMapState', () => {
    it('returns bases, resources, enemies, territories', () => {
      const state = service.getMapState();
      expect(state.bases.length).toBeGreaterThan(0);
      expect(state.resources.length).toBeGreaterThan(0);
      expect(state.enemies.length).toBeGreaterThan(0);
      expect(state.territories.length).toBeGreaterThan(0);
    });

    it('marks player base with isPlayer=true at col=13 row=10', () => {
      const { bases } = service.getMapState('zerg');
      const playerBase = bases.find((b) => b.isPlayer);
      expect(playerBase).toBeDefined();
      expect(playerBase?.col).toBe(13);
      expect(playerBase?.row).toBe(10);
      expect(playerBase?.race).toBe('zerg');
    });

    it('enemy bases do not have isPlayer flag', () => {
      const { bases } = service.getMapState();
      const nonPlayer = bases.filter((b) => !b.isPlayer);
      nonPlayer.forEach((b) => expect(b.isPlayer).toBeFalsy());
    });
  });

  // ── validateCoordinates ────────────────────────────────────────────────────

  describe('validateCoordinates', () => {
    it.each([
      [-1, 0],
      [26, 0],
      [0, -1],
      [0, 20],
      [-1, -1],
      [26, 20],
    ])('throws 400 for out-of-bounds col=%i row=%i', (col, row) => {
      expect(() => service.validateCoordinates(col, row)).toThrow(BadRequestException);
    });

    it.each([
      [0, 0],
      [25, 0],
      [0, 19],
      [25, 19],
      [13, 10],
    ])('accepts valid coordinates col=%i row=%i', (col, row) => {
      expect(() => service.validateCoordinates(col, row)).not.toThrow();
    });
  });

  // ── validateActionTarget ───────────────────────────────────────────────────

  describe('validateActionTarget', () => {
    it('attack on enemy base succeeds', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.ATTACK, 3, 3), // zerg-1
      ).not.toThrow();
    });

    it('attack on enemy unit succeeds', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.ATTACK, 10, 5), // enemy-0
      ).not.toThrow();
    });

    it('attack on player own base throws 400', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.ATTACK, 13, 10),
      ).toThrow(BadRequestException);
    });

    it('attack on resource node throws 400', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.ATTACK, 8, 5), // mineral
      ).toThrow(BadRequestException);
    });

    it('gather on resource succeeds', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.GATHER, 8, 5),
      ).not.toThrow();
    });

    it('gather on enemy base throws 400', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.GATHER, 3, 3),
      ).toThrow(BadRequestException);
    });

    it('gather on enemy unit throws 400', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.GATHER, 10, 5),
      ).toThrow(BadRequestException);
    });

    it('defend on own base succeeds', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.DEFEND, 13, 10),
      ).not.toThrow();
    });

    it('defend on enemy base throws 400', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.DEFEND, 3, 3),
      ).toThrow(BadRequestException);
    });

    it('upgrade on own base succeeds', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.UPGRADE, 13, 10),
      ).not.toThrow();
    });

    it('rally on own base succeeds', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.RALLY, 13, 10),
      ).not.toThrow();
    });

    it('rally on enemy base succeeds', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.RALLY, 3, 3),
      ).not.toThrow();
    });

    it('flee on enemy unit succeeds', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.FLEE, 10, 5),
      ).not.toThrow();
    });

    it('flee on empty tile throws 400', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.FLEE, 1, 1),
      ).toThrow(BadRequestException);
    });

    it('scout on enemy base succeeds', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.SCOUT, 3, 3),
      ).not.toThrow();
    });

    it('scout on resource succeeds', () => {
      expect(() =>
        service.validateActionTarget(MapActionType.SCOUT, 8, 5),
      ).not.toThrow();
    });
  });

  // ── enforceRateLimit ───────────────────────────────────────────────────────

  describe('enforceRateLimit', () => {
    it('allows action when under rate limit', async () => {
      redis.zcard.mockResolvedValue(5);
      await expect(service.enforceRateLimit(PLAYER_ID)).resolves.not.toThrow();
    });

    it('allows exactly 9 prior actions (count=9)', async () => {
      redis.zcard.mockResolvedValue(9);
      await expect(service.enforceRateLimit(PLAYER_ID)).resolves.not.toThrow();
    });

    it('throws 429 when count reaches limit (count=10)', async () => {
      redis.zcard.mockResolvedValue(10);
      await expect(service.enforceRateLimit(PLAYER_ID)).rejects.toThrow(
        new HttpException('Rate limit exceeded: max 10 actions per minute', HttpStatus.TOO_MANY_REQUESTS),
      );
    });

    it('throws 429 when count exceeds limit (count=15)', async () => {
      redis.zcard.mockResolvedValue(15);
      await expect(service.enforceRateLimit(PLAYER_ID)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('cleans stale entries and records new action in Redis', async () => {
      redis.zcard.mockResolvedValue(2);
      await service.enforceRateLimit(PLAYER_ID);
      expect(redis.zremrangebyscore).toHaveBeenCalledWith(
        `map:rate:${PLAYER_ID}`,
        '-inf',
        expect.any(Number),
      );
      expect(redis.zadd).toHaveBeenCalled();
      expect(redis.expire).toHaveBeenCalledWith(`map:rate:${PLAYER_ID}`, 60);
    });
  });

  // ── getPlayerResources ────────────────────────────────────────────────────

  describe('getPlayerResources', () => {
    it('returns resources for existing player', async () => {
      const result = await service.getPlayerResources(PLAYER_ID);
      expect(result).toMatchObject({
        mineral: 2400, gas: 840, energy: 1200,
        population: 12, populationCap: 50,
      });
    });

    it('creates default resources for new player', async () => {
      resourcesRepo.findOne.mockResolvedValue(null);
      const result = await service.getPlayerResources(PLAYER_ID);
      expect(resourcesRepo.create).toHaveBeenCalledWith({ playerId: PLAYER_ID });
      expect(resourcesRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('mineral');
    });

    it('throws 401 when playerId is empty', async () => {
      await expect(service.getPlayerResources('')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── executeAction ─────────────────────────────────────────────────────────

  describe('executeAction', () => {
    it('returns ok=true with message and updatedResources on success', async () => {
      const dto = makeDto({ action: MapActionType.ATTACK, targetCol: 3, targetRow: 3 });
      const result = await service.executeAction(dto);
      expect(result.ok).toBe(true);
      expect(result.message).toBeTruthy();
      expect(result.updatedResources).toHaveProperty('mineral');
    });

    it('logs the action to the database', async () => {
      const dto = makeDto({ action: MapActionType.GATHER, targetCol: 8, targetRow: 5 });
      await service.executeAction(dto);
      expect(actionLogRepo.save).toHaveBeenCalled();
    });

    it('rejects action when rate limit exceeded', async () => {
      redis.zcard.mockResolvedValue(10);
      await expect(service.executeAction(makeDto())).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('rejects invalid action-target combination', async () => {
      const dto = makeDto({ action: MapActionType.GATHER, targetCol: 3, targetRow: 3 }); // gather on base
      await expect(service.executeAction(dto)).rejects.toThrow(BadRequestException);
    });
  });
});
