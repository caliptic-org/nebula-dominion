import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building, BuildingType } from '../../buildings/entities/building.entity';
import { UnitType } from '../../units/constants/race-configs.constants';
import { PlayerUnit } from '../../units/entities/player-unit.entity';
import { BasesService } from '../bases.service';
import { BaseProductionQueueEntry } from '../entities/base-production-queue.entity';

const PLAYER_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_PLAYER_ID = '00000000-0000-0000-0000-000000000002';
const BASE_ID = '00000000-0000-0000-0000-0000000000aa';

const mockRepo = <T extends object>() =>
  ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  }) as unknown as jest.Mocked<Repository<T>>;

function makeOwnedBase(): Building {
  return {
    id: BASE_ID,
    playerId: PLAYER_ID,
    type: BuildingType.COMMAND_CENTER,
  } as Building;
}

describe('BasesService', () => {
  let service: BasesService;
  let queueRepo: jest.Mocked<Repository<BaseProductionQueueEntry>>;
  let buildingRepo: jest.Mocked<Repository<Building>>;
  let unitRepo: jest.Mocked<Repository<PlayerUnit>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BasesService,
        { provide: getRepositoryToken(BaseProductionQueueEntry), useFactory: mockRepo },
        { provide: getRepositoryToken(Building), useFactory: mockRepo },
        { provide: getRepositoryToken(PlayerUnit), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(BasesService);
    queueRepo = module.get(getRepositoryToken(BaseProductionQueueEntry));
    buildingRepo = module.get(getRepositoryToken(Building));
    unitRepo = module.get(getRepositoryToken(PlayerUnit));

    // Sensible default: queueRepo.create acts as pass-through
    queueRepo.create.mockImplementation((dto) => dto as BaseProductionQueueEntry);
    queueRepo.save.mockImplementation(async (entry) => {
      // single-entity overload
      if (Array.isArray(entry)) return entry as any;
      return { id: 'new-id', ...(entry as object) } as any;
    });
    unitRepo.create.mockImplementation((dto) => dto as PlayerUnit);
    unitRepo.save.mockImplementation(async (entry) => entry as any);
  });

  describe('assertBaseOwnership', () => {
    it('throws NotFoundException when base does not exist', async () => {
      buildingRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      await expect(service.assertBaseOwnership(BASE_ID, PLAYER_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when base belongs to another player', async () => {
      buildingRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: BASE_ID,
          playerId: OTHER_PLAYER_ID,
          type: BuildingType.COMMAND_CENTER,
        } as Building);

      await expect(service.assertBaseOwnership(BASE_ID, PLAYER_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns the building when the caller owns it', async () => {
      const owned = makeOwnedBase();
      buildingRepo.findOne.mockResolvedValueOnce(owned);
      await expect(service.assertBaseOwnership(BASE_ID, PLAYER_ID)).resolves.toBe(owned);
    });
  });

  describe('getQueue', () => {
    it('maps rows to DTOs with remainingSeconds derived from completesAt', async () => {
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());
      const now = Date.now();
      const entry: BaseProductionQueueEntry = {
        id: 'q1',
        playerId: PLAYER_ID,
        baseId: BASE_ID,
        unitType: 'marine',
        unitName: 'Marine',
        unitEmoji: '🪖',
        level: 2,
        position: 1,
        totalDurationSeconds: 40,
        startedAt: new Date(now - 10_000),
        completesAt: new Date(now + 30_000),
        isComplete: false,
        createdAt: new Date(now - 10_000),
      };
      queueRepo.find.mockResolvedValueOnce([entry]);

      const res = await service.getQueue(BASE_ID, PLAYER_ID);
      expect(res.queue).toHaveLength(1);
      expect(res.queue[0]).toMatchObject({
        id: 'q1',
        unitType: 'marine',
        unitName: 'Marine',
        unitEmoji: '🪖',
        level: 2,
        position: 1,
        totalDurationSeconds: 40,
      });
      expect(res.queue[0].remainingSeconds).toBeGreaterThan(28);
      expect(res.queue[0].remainingSeconds).toBeLessThanOrEqual(30);
    });
  });

  describe('queueUnit', () => {
    it('rejects with 409 when the queue is at MAX_QUEUE_SIZE', async () => {
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());
      const full = Array.from({ length: 5 }, (_, i) => ({
        id: `q${i}`,
        position: i + 1,
        completesAt: new Date(Date.now() + (i + 1) * 60_000),
      })) as BaseProductionQueueEntry[];
      queueRepo.find.mockResolvedValueOnce(full);

      await expect(
        service.queueUnit(BASE_ID, PLAYER_ID, { unitType: 'marine', level: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('starts a fresh queue head at now and computes completesAt from base trainTime', async () => {
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());
      queueRepo.find.mockResolvedValueOnce([]);

      const before = Date.now();
      const dto = await service.queueUnit(BASE_ID, PLAYER_ID, {
        unitType: 'marine',
        level: 1,
      });
      const after = Date.now();

      expect(dto.position).toBe(1);
      expect(dto.unitType).toBe('marine');
      expect(dto.unitName).toBe('Marine');
      expect(dto.totalDurationSeconds).toBe(20); // marine base trainTime
      expect(new Date(dto.startedAt).getTime()).toBeGreaterThanOrEqual(before);
      expect(new Date(dto.startedAt).getTime()).toBeLessThanOrEqual(after);
    });

    it('chains subsequent items behind the current tail', async () => {
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());
      const tailCompletesAt = new Date(Date.now() + 60_000);
      queueRepo.find.mockResolvedValueOnce([
        {
          id: 'q1',
          position: 1,
          totalDurationSeconds: 60,
          startedAt: new Date(Date.now()),
          completesAt: tailCompletesAt,
        } as BaseProductionQueueEntry,
      ]);

      const dto = await service.queueUnit(BASE_ID, PLAYER_ID, {
        unitType: 'zergling',
        level: 1,
      });

      expect(dto.position).toBe(2);
      // zergling base trainTime = 15s; startedAt should be the tail's completesAt
      expect(new Date(dto.startedAt).getTime()).toBe(tailCompletesAt.getTime());
    });

    it('applies +20% duration per level beyond 1', async () => {
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());
      queueRepo.find.mockResolvedValueOnce([]);

      const dto = await service.queueUnit(BASE_ID, PLAYER_ID, {
        unitType: 'marine', // base 20s
        level: 3,           // multiplier 1.4 → 28s
      });

      expect(dto.totalDurationSeconds).toBe(28);
    });

    it('falls back to a default duration for unknown unitType', async () => {
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());
      queueRepo.find.mockResolvedValueOnce([]);

      const dto = await service.queueUnit(BASE_ID, PLAYER_ID, {
        unitType: 'shadow_lord',
        level: 1,
      });

      expect(dto.totalDurationSeconds).toBe(30);
      expect(dto.unitName).toBe('Shadow Lord');
      expect(dto.unitEmoji).toBe('⚔️');
    });
  });

  describe('cancelUnit', () => {
    it('throws 404 when the entry is not in the base queue', async () => {
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());
      queueRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.cancelUnit(BASE_ID, PLAYER_ID, '11111111-1111-1111-1111-111111111111'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('shifts subsequent entries earlier by the cancelled duration', async () => {
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());

      const cancelled: BaseProductionQueueEntry = {
        id: 'q1',
        playerId: PLAYER_ID,
        baseId: BASE_ID,
        position: 1,
        totalDurationSeconds: 30,
        startedAt: new Date(0),
        completesAt: new Date(30_000),
        isComplete: false,
      } as BaseProductionQueueEntry;
      queueRepo.findOne.mockResolvedValueOnce(cancelled);

      const subsequent: BaseProductionQueueEntry[] = [
        {
          id: 'q2',
          position: 2,
          totalDurationSeconds: 20,
          startedAt: new Date(30_000),
          completesAt: new Date(50_000),
          isComplete: false,
        } as BaseProductionQueueEntry,
        {
          id: 'q3',
          position: 3,
          totalDurationSeconds: 60,
          startedAt: new Date(50_000),
          completesAt: new Date(110_000),
          isComplete: false,
        } as BaseProductionQueueEntry,
      ];
      queueRepo.find.mockResolvedValueOnce(subsequent);

      await service.cancelUnit(BASE_ID, PLAYER_ID, 'q1');

      expect(queueRepo.remove).toHaveBeenCalledWith(cancelled);
      expect(subsequent[0].position).toBe(1);
      expect(subsequent[0].startedAt.getTime()).toBe(0);
      expect(subsequent[0].completesAt.getTime()).toBe(20_000);
      expect(subsequent[1].position).toBe(2);
      expect(subsequent[1].startedAt.getTime()).toBe(20_000);
      expect(subsequent[1].completesAt.getTime()).toBe(80_000);
      expect(queueRepo.save).toHaveBeenCalledWith(subsequent);
    });
  });

  describe('processCompleted', () => {
    it('marks overdue entries complete and mints PlayerUnits for known types', async () => {
      const overdue: BaseProductionQueueEntry = {
        id: 'q1',
        playerId: PLAYER_ID,
        baseId: BASE_ID,
        unitType: UnitType.MARINE,
        unitName: 'Marine',
        unitEmoji: '🪖',
        level: 2,
        position: 1,
        totalDurationSeconds: 20,
        startedAt: new Date(Date.now() - 30_000),
        completesAt: new Date(Date.now() - 10_000),
        isComplete: false,
      } as BaseProductionQueueEntry;
      queueRepo.find.mockResolvedValueOnce([overdue]);
      queueRepo.find.mockResolvedValueOnce([]); // remaining after compaction

      const count = await service.processCompleted();

      expect(count).toBe(1);
      expect(overdue.isComplete).toBe(true);
      expect(unitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: PLAYER_ID,
          type: UnitType.MARINE,
          level: 2,
          isAlive: true,
        }),
      );
      expect(unitRepo.save).toHaveBeenCalledTimes(1);
    });

    it('does not mint a PlayerUnit for an unknown unitType', async () => {
      const overdue: BaseProductionQueueEntry = {
        id: 'q1',
        playerId: PLAYER_ID,
        baseId: BASE_ID,
        unitType: 'shadow_lord',
        unitName: 'Shadow Lord',
        unitEmoji: '⚔️',
        level: 1,
        position: 1,
        totalDurationSeconds: 30,
        startedAt: new Date(Date.now() - 40_000),
        completesAt: new Date(Date.now() - 10_000),
        isComplete: false,
      } as BaseProductionQueueEntry;
      queueRepo.find.mockResolvedValueOnce([overdue]);
      queueRepo.find.mockResolvedValueOnce([]);

      await service.processCompleted();
      expect(unitRepo.save).not.toHaveBeenCalled();
    });
  });
});
