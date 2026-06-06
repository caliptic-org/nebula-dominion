import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Building, BuildingType } from '../../buildings/entities/building.entity';
import { UnitType } from '../../units/constants/race-configs.constants';
import { PlayerUnit } from '../../units/entities/player-unit.entity';
import { CommandersService } from '../../commanders/commanders.service';
import { ResourcesService } from '../../resources/resources.service';
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
  let resources: { canAfford: jest.Mock; deduct: jest.Mock };
  let commanders: { getActiveBonus: jest.Mock };
  let dataSourceQuery: jest.Mock;

  beforeEach(async () => {
    resources = {
      canAfford: jest.fn().mockResolvedValue(true),
      deduct: jest.fn().mockResolvedValue(undefined),
    };
    commanders = {
      // No active commander → zero multipliers; queueUnit clamps to 1.0×.
      getActiveBonus: jest.fn().mockResolvedValue({
        trainCostMultiplier: 0,
        trainSpeedMultiplier: 0,
        hpMultiplier: 0,
      }),
    };
    // Default: player has race=human so 'marine' orders pass the
    // race-match gate. Tests that exercise the cross-race rejection
    // override this on a per-test basis.
    dataSourceQuery = jest.fn().mockResolvedValue([{ race: 'human' }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BasesService,
        { provide: getRepositoryToken(BaseProductionQueueEntry), useFactory: mockRepo },
        { provide: getRepositoryToken(Building), useFactory: mockRepo },
        { provide: getRepositoryToken(PlayerUnit), useFactory: mockRepo },
        { provide: ResourcesService, useValue: resources },
        { provide: CommandersService, useValue: commanders },
        {
          provide: getDataSourceToken(),
          useValue: { query: dataSourceQuery } as unknown as DataSource,
        },
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
      // Player race = zerg for this case so a 'zergling' order clears
      // the race-match gate.
      dataSourceQuery.mockResolvedValueOnce([{ race: 'zerg' }]);
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

    it('rejects with 400 when unitType is not in UNIT_CONFIGS', async () => {
      // Pre-fix this path silently accepted arbitrary types and let the
      // worker swallow them at mint time. Now the catalog gate fires
      // first so the player gets immediate feedback (and a wallet
      // debit can't sneak through for an off-catalog name).
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());

      await expect(
        service.queueUnit(BASE_ID, PLAYER_ID, { unitType: 'shadow_lord', level: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(resources.deduct).not.toHaveBeenCalled();
    });

    it('rejects with 403 when unit race != player race (ECON-CYC6-01)', async () => {
      // Zerg account trying to queue Human marine — the exact exploit
      // pattern flagged in the audit. Pre-fix this minted a free L20
      // human marine; post-fix it has to be a ForbiddenException and the
      // wallet stays untouched.
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());
      dataSourceQuery.mockResolvedValueOnce([{ race: 'zerg' }]);

      await expect(
        service.queueUnit(BASE_ID, PLAYER_ID, { unitType: 'marine', level: 20 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(resources.canAfford).not.toHaveBeenCalled();
      expect(resources.deduct).not.toHaveBeenCalled();
      expect(queueRepo.save).not.toHaveBeenCalled();
    });

    it('rejects with 403 when the player has no race set', async () => {
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());
      dataSourceQuery.mockResolvedValueOnce([{ race: null }]);

      await expect(
        service.queueUnit(BASE_ID, PLAYER_ID, { unitType: 'marine', level: 1 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(resources.deduct).not.toHaveBeenCalled();
    });

    it('rejects with 400 when the player cannot afford the scaled cost', async () => {
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());
      resources.canAfford.mockResolvedValueOnce(false);
      queueRepo.find.mockResolvedValueOnce([]);

      await expect(
        service.queueUnit(BASE_ID, PLAYER_ID, { unitType: 'marine', level: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(resources.deduct).not.toHaveBeenCalled();
      expect(queueRepo.save).not.toHaveBeenCalled();
    });

    it('charges scaled cost (1.5^(level-1)) and deducts before saving', async () => {
      // Marine base cost: 50M 0G 0E (from UNIT_CONFIGS). L3 scale = 1.5²
      // = 2.25 → 113M deducted. canAfford passes, deduct receives the
      // computed cost object, and only then is the queue row persisted.
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());
      queueRepo.find.mockResolvedValueOnce([]);

      await service.queueUnit(BASE_ID, PLAYER_ID, {
        unitType: 'marine',
        level: 3,
      });

      expect(resources.canAfford).toHaveBeenCalledWith(
        PLAYER_ID,
        expect.objectContaining({ mineral: expect.any(Number) }),
      );
      expect(resources.deduct).toHaveBeenCalledTimes(1);
      const [, deductCost] = resources.deduct.mock.calls[0];
      // 50 × 1.5² = 112.5 → rounded to 113. Don't pin the exact value
      // brittle-style; assert the scaling shape (> base, < base × 1.5^3).
      expect(deductCost.mineral).toBeGreaterThan(50);
      expect(deductCost.mineral).toBeLessThan(Math.round(50 * Math.pow(1.5, 3)));
      // Deduct must fire BEFORE save so a refused queue insert wouldn't
      // skip the wallet check on retry.
      const deductOrder = resources.deduct.mock.invocationCallOrder[0];
      const saveOrder = queueRepo.save.mock.invocationCallOrder[0];
      expect(deductOrder).toBeLessThan(saveOrder);
    });

    it('rejects merge-only units (trainable=false) with 400', async () => {
      // Sniper is a merge-result type (T2, see MERGE_RECIPES). Even on a
      // Human account with infinite resources, a direct POST must bounce.
      buildingRepo.findOne.mockResolvedValueOnce(makeOwnedBase());

      await expect(
        service.queueUnit(BASE_ID, PLAYER_ID, { unitType: 'sniper', level: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(resources.deduct).not.toHaveBeenCalled();
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
