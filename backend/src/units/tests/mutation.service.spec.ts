import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MutationService } from '../mutation.service';
import { MutationRule } from '../entities/mutation-rule.entity';
import { UnitRace } from '../types/units.types';

const makeRule = (overrides: Partial<MutationRule> = {}): MutationRule =>
  Object.assign(new MutationRule(), {
    id: 'rule-1',
    sourceRace1: UnitRace.HUMAN,
    sourceRace2: UnitRace.ZERG,
    minTierLevel: 3,
    resultRace: UnitRace.ZERG,
    resultNameTemplate: 'Infested [name]',
    attackMultiplier: 1.20,
    defenseMultiplier: 1.05,
    hpMultiplier: 1.10,
    speedMultiplier: 1.10,
    bonusAbilities: ['hive_mind'],
    description: 'Human infested by zerg.',
    isActive: true,
    ...overrides,
  });

describe('MutationService', () => {
  let service: MutationService;
  let ruleRepo: any;

  beforeEach(async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    };

    ruleRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn(),
      qb,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MutationService,
        { provide: getRepositoryToken(MutationRule), useValue: ruleRepo },
      ],
    }).compile();

    service = module.get(MutationService);
  });

  describe('findAll', () => {
    it('returns mapped tree entries', async () => {
      ruleRepo.qb.getMany.mockResolvedValue([makeRule()]);
      const results = await service.findAll();
      expect(results).toHaveLength(1);
      expect(results[0].sourceRace1).toBe(UnitRace.HUMAN);
    });
  });

  describe('findRuleById', () => {
    it('throws NotFoundException when rule not found', async () => {
      ruleRepo.findOne.mockResolvedValue(null);
      await expect(service.findRuleById('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns rule when found', async () => {
      const rule = makeRule();
      ruleRepo.findOne.mockResolvedValue(rule);
      const result = await service.findRuleById('rule-1');
      expect(result.id).toBe('rule-1');
    });
  });

  describe('toTreeEntry', () => {
    it('converts decimals to numbers', () => {
      const rule = makeRule({ attackMultiplier: '1.20' as any });
      const entry = service.toTreeEntry(rule);
      expect(typeof entry.attackMultiplier).toBe('number');
      expect(entry.attackMultiplier).toBe(1.2);
    });

    it('includes all required fields', () => {
      const entry = service.toTreeEntry(makeRule());
      expect(entry.ruleId).toBeDefined();
      expect(entry.sourceRace1).toBeDefined();
      expect(entry.sourceRace2).toBeDefined();
      expect(entry.resultRace).toBeDefined();
      expect(entry.bonusAbilities).toBeInstanceOf(Array);
    });
  });
});
