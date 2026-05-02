import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { MergeService } from '../merge.service';
import { UnitsService } from '../units.service';
import { MutationService } from '../mutation.service';
import { RedisService } from '../../redis/redis.service';
import { Unit } from '../entities/unit.entity';
import { MutationRule } from '../entities/mutation-rule.entity';
import { UnitRace, MergeSessionStatus } from '../types/units.types';

const makeUnit = (overrides: Partial<Unit> = {}): Unit =>
  Object.assign(new Unit(), {
    id: 'unit-1',
    playerId: 'player-1',
    name: 'Soldier',
    race: UnitRace.HUMAN,
    tierLevel: 5,
    attack: 50,
    defense: 30,
    hp: 200,
    maxHp: 200,
    speed: 20,
    abilities: [],
    mergeCount: 0,
    parentUnitIds: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makeRule = (overrides: Partial<MutationRule> = {}): MutationRule =>
  Object.assign(new MutationRule(), {
    id: 'rule-1',
    sourceRace1: UnitRace.HUMAN,
    sourceRace2: UnitRace.HUMAN,
    minTierLevel: 1,
    resultRace: UnitRace.HUMAN,
    resultNameTemplate: 'Veteran [name]',
    attackMultiplier: 1.15,
    defenseMultiplier: 1.10,
    hpMultiplier: 1.10,
    speedMultiplier: 1.05,
    bonusAbilities: [],
    description: 'Same-race evolution',
    isActive: true,
    ...overrides,
  });

describe('MergeService', () => {
  let service: MergeService;
  let unitsService: jest.Mocked<UnitsService>;
  let mutationService: jest.Mocked<MutationService>;
  let redis: jest.Mocked<RedisService>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MergeService,
        {
          provide: UnitsService,
          useValue: {
            assertOwnership: jest.fn(),
            findActiveById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: MutationService,
          useValue: {
            findRuleForPair: jest.fn(),
            findRuleById: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
            keys: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(600) },
        },
        {
          provide: getRepositoryToken(Unit),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(MergeService);
    unitsService = module.get(UnitsService);
    mutationService = module.get(MutationService);
    redis = module.get(RedisService);
    dataSource = module.get(DataSource);
  });

  // ─── initiateMerge ────────────────────────────────────────────────────────

  describe('initiateMerge', () => {
    it('throws when merging a unit with itself', async () => {
      await expect(
        service.initiateMerge({ playerId: 'p1', unit1Id: 'u1', unit2Id: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when tier gap exceeds limit for same race', async () => {
      const u1 = makeUnit({ id: 'u1', tierLevel: 1 });
      const u2 = makeUnit({ id: 'u2', tierLevel: 10 });
      unitsService.assertOwnership
        .mockResolvedValueOnce(u1)
        .mockResolvedValueOnce(u2);

      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when unit at max tier', async () => {
      const u1 = makeUnit({ id: 'u1', tierLevel: 54 });
      const u2 = makeUnit({ id: 'u2', tierLevel: 54 });
      unitsService.assertOwnership
        .mockResolvedValueOnce(u1)
        .mockResolvedValueOnce(u2);

      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when no mutation rule found', async () => {
      const u1 = makeUnit({ id: 'u1', race: UnitRace.HUMAN, tierLevel: 5 });
      const u2 = makeUnit({ id: 'u2', race: UnitRace.ZERG, tierLevel: 5 });
      unitsService.assertOwnership
        .mockResolvedValueOnce(u1)
        .mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(null);

      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a Redis session and returns preview for valid same-race merge', async () => {
      const u1 = makeUnit({ id: 'u1' });
      const u2 = makeUnit({ id: 'u2' });
      const rule = makeRule();

      unitsService.assertOwnership
        .mockResolvedValueOnce(u1)
        .mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(rule);
      redis.set.mockResolvedValue(undefined);

      const result = await service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' });

      expect(result.sessionId).toBeDefined();
      expect(result.preview.resultRace).toBe(UnitRace.HUMAN);
      expect(result.preview.resultTierLevel).toBe(6); // tier 5 + 1
      expect(result.preview.isEvolvedSameRace).toBe(true);
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('merge:session:'),
        expect.any(String),
        600,
      );
    });

    it('throws ConflictException when a unit is already in an active session', async () => {
      const u1 = makeUnit({ id: 'u1' });
      const u2 = makeUnit({ id: 'u2' });

      unitsService.assertOwnership
        .mockResolvedValueOnce(u1)
        .mockResolvedValueOnce(u2);

      redis.keys.mockResolvedValue(['merge:session:existing']);
      redis.get.mockResolvedValue(
        JSON.stringify({
          sessionId: 'existing',
          playerId: 'player-1',
          unit1Id: 'u1',
          unit2Id: 'u3',
          status: MergeSessionStatus.PENDING,
        }),
      );

      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── calculatePreview internals ───────────────────────────────────────────

  describe('preview stat calculation', () => {
    it('takes max of each stat before applying multipliers', async () => {
      // unit1 has higher attack, unit2 has higher defense
      const u1 = makeUnit({ id: 'u1', attack: 100, defense: 20, hp: 150, speed: 25 });
      const u2 = makeUnit({ id: 'u2', attack: 60, defense: 50, hp: 200, speed: 10 });
      const rule = makeRule({
        attackMultiplier: 1.0,
        defenseMultiplier: 1.0,
        hpMultiplier: 1.0,
        speedMultiplier: 1.0,
      });

      unitsService.assertOwnership
        .mockResolvedValueOnce(u1)
        .mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(rule);
      redis.set.mockResolvedValue(undefined);

      const { preview } = await service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' });
      expect(preview.attack).toBe(100);   // max(100, 60)
      expect(preview.defense).toBe(50);   // max(20, 50)
      expect(preview.hp).toBe(200);       // max(150, 200)
      expect(preview.speed).toBe(25);     // max(25, 10)
    });

    it('merges abilities from both units plus bonus abilities', async () => {
      const u1 = makeUnit({ id: 'u1', abilities: ['regeneration'] });
      const u2 = makeUnit({ id: 'u2', abilities: ['berserker'] });
      const rule = makeRule({ bonusAbilities: ['void_armor'] });

      unitsService.assertOwnership
        .mockResolvedValueOnce(u1)
        .mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(rule);
      redis.set.mockResolvedValue(undefined);

      const { preview } = await service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' });
      expect(preview.abilities).toContain('regeneration');
      expect(preview.abilities).toContain('berserker');
      expect(preview.abilities).toContain('void_armor');
    });

    it('deduplicates abilities', async () => {
      const u1 = makeUnit({ id: 'u1', abilities: ['regeneration', 'berserker'] });
      const u2 = makeUnit({ id: 'u2', abilities: ['regeneration'] });
      const rule = makeRule({ bonusAbilities: [] });

      unitsService.assertOwnership
        .mockResolvedValueOnce(u1)
        .mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(rule);
      redis.set.mockResolvedValue(undefined);

      const { preview } = await service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' });
      const count = preview.abilities.filter((a) => a === 'regeneration').length;
      expect(count).toBe(1);
    });

    it('produces cross-race tier as floor average', async () => {
      const u1 = makeUnit({ id: 'u1', race: UnitRace.HUMAN, tierLevel: 5 });
      const u2 = makeUnit({ id: 'u2', race: UnitRace.ZERG, tierLevel: 6 });
      const rule = makeRule({
        sourceRace1: UnitRace.HUMAN,
        sourceRace2: UnitRace.ZERG,
        resultRace: UnitRace.ZERG,
        resultNameTemplate: 'Infested [name]',
      });

      unitsService.assertOwnership
        .mockResolvedValueOnce(u1)
        .mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(rule);
      redis.set.mockResolvedValue(undefined);

      const { preview } = await service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' });
      expect(preview.resultTierLevel).toBe(5); // floor((5+6)/2) = 5
      expect(preview.isEvolvedSameRace).toBe(false);
    });
  });

  // ─── cancelSession ────────────────────────────────────────────────────────

  describe('cancelSession', () => {
    it('deletes the Redis key', async () => {
      const session = {
        sessionId: 'sess-1',
        playerId: 'player-1',
        unit1Id: 'u1',
        unit2Id: 'u2',
        preview: {},
        status: MergeSessionStatus.PENDING,
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      redis.get.mockResolvedValue(JSON.stringify(session));
      redis.del.mockResolvedValue(undefined);

      await service.cancelSession('sess-1', 'player-1');
      expect(redis.del).toHaveBeenCalledWith('merge:session:sess-1');
    });

    it('throws if session belongs to another player', async () => {
      const session = {
        sessionId: 'sess-1',
        playerId: 'player-other',
      };
      redis.get.mockResolvedValue(JSON.stringify(session));

      await expect(service.cancelSession('sess-1', 'player-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getSession ───────────────────────────────────────────────────────────

  describe('getSession', () => {
    it('throws NotFoundException when session not found', async () => {
      redis.get.mockResolvedValue(null);
      await expect(service.getSession('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns parsed session when found', async () => {
      const session = {
        sessionId: 'sess-1',
        playerId: 'player-1',
        unit1Id: 'u1',
        unit2Id: 'u2',
      };
      redis.get.mockResolvedValue(JSON.stringify(session));
      const result = await service.getSession('sess-1');
      expect(result.sessionId).toBe('sess-1');
    });
  });
});
