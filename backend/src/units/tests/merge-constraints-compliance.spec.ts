/**
 * Compliance tests: Merge and mutation constraint system against the design
 * document (CAL-105). Tests boundary values, tier calculations, and stat
 * preview formulas documented in merge.service.ts.
 *
 * Design constants:
 *   MAX_TIER = 54          (6 ages × 9 levels)
 *   SAME_RACE_TIER_GAP = 3 (max tier difference for same-race merge)
 *   CROSS_RACE_TIER_GAP = 3 (max tier difference for cross-race merge)
 *
 * Tier result formulas:
 *   same-race:  min(54, max(t1, t2) + 1)
 *   cross-race: floor((t1 + t2) / 2)
 *
 * Stat preview:
 *   stat = round(max(stat1, stat2) * multiplier)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { MergeService } from '../merge.service';
import { UnitsService } from '../units.service';
import { MutationService } from '../mutation.service';
import { RedisService } from '../../redis/redis.service';
import { Unit } from '../entities/unit.entity';
import { MutationRule } from '../entities/mutation-rule.entity';
import { UnitRace } from '../types/units.types';

const MAX_TIER = 54;

function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return Object.assign(new Unit(), {
    id: 'u-' + Math.random().toString(36).slice(2),
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
}

function makeRule(overrides: Partial<MutationRule> = {}): MutationRule {
  return Object.assign(new MutationRule(), {
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
}

describe('[Compliance] Merge & Mutation Constraints (CAL-105)', () => {
  let service: MergeService;
  let unitsService: jest.Mocked<UnitsService>;
  let mutationService: jest.Mocked<MutationService>;
  let redis: jest.Mocked<RedisService>;

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
            get: jest.fn().mockResolvedValue(null),
            del: jest.fn(),
            exists: jest.fn(),
            keys: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
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

    service       = module.get(MergeService);
    unitsService  = module.get(UnitsService);
    mutationService = module.get(MutationService);
    redis         = module.get(RedisService);
  });

  // ── Same-race tier gap constraints ────────────────────────────────────────

  describe('same-race tier gap (max = 3)', () => {
    it('gap = 3 (boundary) is allowed', async () => {
      const u1 = makeUnit({ id: 'u1', tierLevel: 5 });
      const u2 = makeUnit({ id: 'u2', tierLevel: 8 }); // gap = 3
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(makeRule());
      redis.set.mockResolvedValue(undefined);

      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' }),
      ).resolves.toBeDefined();
    });

    it('gap = 4 (just over boundary) throws BadRequestException', async () => {
      const u1 = makeUnit({ id: 'u1', tierLevel: 5 });
      const u2 = makeUnit({ id: 'u2', tierLevel: 9 }); // gap = 4
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);

      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('gap = 9 throws BadRequestException', async () => {
      const u1 = makeUnit({ id: 'u1', tierLevel: 1 });
      const u2 = makeUnit({ id: 'u2', tierLevel: 10 });
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);

      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('gap = 0 (same tier) is allowed', async () => {
      const u1 = makeUnit({ id: 'u1', tierLevel: 7 });
      const u2 = makeUnit({ id: 'u2', tierLevel: 7 });
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(makeRule());
      redis.set.mockResolvedValue(undefined);

      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' }),
      ).resolves.toBeDefined();
    });
  });

  // ── Cross-race tier gap constraints ───────────────────────────────────────

  describe('cross-race tier gap (max = 3)', () => {
    const crossRule = () =>
      makeRule({ sourceRace1: UnitRace.HUMAN, sourceRace2: UnitRace.ZERG, resultRace: UnitRace.ZERG });

    it('cross-race gap = 3 (boundary) is allowed', async () => {
      const u1 = makeUnit({ id: 'u1', race: UnitRace.HUMAN, tierLevel: 5 });
      const u2 = makeUnit({ id: 'u2', race: UnitRace.ZERG, tierLevel: 8 }); // gap = 3
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(crossRule());
      redis.set.mockResolvedValue(undefined);

      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' }),
      ).resolves.toBeDefined();
    });

    it('cross-race gap = 4 throws BadRequestException', async () => {
      const u1 = makeUnit({ id: 'u1', race: UnitRace.HUMAN, tierLevel: 5 });
      const u2 = makeUnit({ id: 'u2', race: UnitRace.ZERG, tierLevel: 9 }); // gap = 4
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);

      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Maximum tier cap (54 = 6 ages × 9 levels) ────────────────────────────

  describe('maximum tier cap (MAX_TIER = 54)', () => {
    it('unit at tier 53 can still be merged (below cap)', async () => {
      const u1 = makeUnit({ id: 'u1', tierLevel: 53 });
      const u2 = makeUnit({ id: 'u2', tierLevel: 53 });
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(makeRule());
      redis.set.mockResolvedValue(undefined);

      const result = await service.initiateMerge({
        playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2',
      });
      expect(result.preview.resultTierLevel).toBe(MAX_TIER); // min(54, 53+1) = 54
    });

    it('unit at tier 54 (max) throws BadRequestException', async () => {
      const u1 = makeUnit({ id: 'u1', tierLevel: MAX_TIER });
      const u2 = makeUnit({ id: 'u2', tierLevel: MAX_TIER });
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);

      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Same-race tier result formula: min(54, max(t1, t2) + 1) ──────────────

  describe('same-race merge result tier', () => {
    async function mergeAndGetTier(t1: number, t2: number): Promise<number> {
      const u1 = makeUnit({ id: 'u1', tierLevel: t1 });
      const u2 = makeUnit({ id: 'u2', tierLevel: t2 });
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(makeRule());
      redis.set.mockResolvedValue(undefined);
      const { preview } = await service.initiateMerge({
        playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2',
      });
      return preview.resultTierLevel;
    }

    it('t1=5, t2=5 → result tier 6 (max+1)', async () => {
      expect(await mergeAndGetTier(5, 5)).toBe(6);
    });

    it('t1=5, t2=7 → result tier 8 (max(5,7)+1)', async () => {
      expect(await mergeAndGetTier(5, 7)).toBe(8);
    });

    it('t1=5, t2=8 → result tier 9 (max(5,8)+1)', async () => {
      expect(await mergeAndGetTier(5, 8)).toBe(9);
    });

    it('t1=1, t2=1 → result tier 2', async () => {
      expect(await mergeAndGetTier(1, 1)).toBe(2);
    });

    it('t1=53, t2=53 → result tier 54 (capped at MAX_TIER)', async () => {
      expect(await mergeAndGetTier(53, 53)).toBe(MAX_TIER);
    });
  });

  // ── Cross-race tier result formula: floor((t1 + t2) / 2) ─────────────────

  describe('cross-race merge result tier', () => {
    const crossRule = (resultRace = UnitRace.ZERG) =>
      makeRule({
        sourceRace1: UnitRace.HUMAN,
        sourceRace2: UnitRace.ZERG,
        resultRace,
        resultNameTemplate: 'Infested [name]',
      });

    async function crossMergeTier(t1: number, t2: number): Promise<number> {
      const u1 = makeUnit({ id: 'u1', race: UnitRace.HUMAN, tierLevel: t1 });
      const u2 = makeUnit({ id: 'u2', race: UnitRace.ZERG, tierLevel: t2 });
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(crossRule());
      redis.set.mockResolvedValue(undefined);
      const { preview } = await service.initiateMerge({
        playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2',
      });
      return preview.resultTierLevel;
    }

    it('t1=5, t2=6 → result tier 5 (floor((5+6)/2))', async () => {
      expect(await crossMergeTier(5, 6)).toBe(5);
    });

    it('t1=6, t2=8 → result tier 7 (floor((6+8)/2))', async () => {
      expect(await crossMergeTier(6, 8)).toBe(7);
    });

    it('t1=4, t2=4 → result tier 4 (floor((4+4)/2))', async () => {
      expect(await crossMergeTier(4, 4)).toBe(4);
    });

    it('t1=7, t2=9 → result tier 8 (floor((7+9)/2))', async () => {
      expect(await crossMergeTier(7, 9)).toBe(8);
    });

    it('cross-race merge sets isEvolvedSameRace = false', async () => {
      const u1 = makeUnit({ id: 'u1', race: UnitRace.HUMAN, tierLevel: 5 });
      const u2 = makeUnit({ id: 'u2', race: UnitRace.ZERG, tierLevel: 5 });
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(crossRule());
      redis.set.mockResolvedValue(undefined);

      const { preview } = await service.initiateMerge({
        playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2',
      });
      expect(preview.isEvolvedSameRace).toBe(false);
    });
  });

  // ── Stat preview formula: max(stat1, stat2) * multiplier ─────────────────

  describe('stat preview formula', () => {
    it('takes max of each stat independently before applying multiplier', async () => {
      const u1 = makeUnit({ id: 'u1', attack: 100, defense: 10, hp: 150, speed: 25 });
      const u2 = makeUnit({ id: 'u2', attack: 60, defense: 50, hp: 200, speed: 10 });
      const rule = makeRule({ attackMultiplier: 1.0, defenseMultiplier: 1.0, hpMultiplier: 1.0, speedMultiplier: 1.0 });

      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(rule);
      redis.set.mockResolvedValue(undefined);

      const { preview } = await service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' });
      expect(preview.attack).toBe(100);  // max(100,60)
      expect(preview.defense).toBe(50);  // max(10,50)
      expect(preview.hp).toBe(200);      // max(150,200)
      expect(preview.speed).toBe(25);    // max(25,10)
    });

    it('stat multipliers are applied with rounding (round half up)', async () => {
      const u1 = makeUnit({ id: 'u1', attack: 100, defense: 100, hp: 100, speed: 100 });
      const u2 = makeUnit({ id: 'u2', attack: 100, defense: 100, hp: 100, speed: 100 });
      const rule = makeRule({
        attackMultiplier: 1.15,   // 100 * 1.15 = 115
        defenseMultiplier: 1.10,  // 100 * 1.10 = 110
        hpMultiplier: 1.10,       // 100 * 1.10 = 110
        speedMultiplier: 1.05,    // 100 * 1.05 = 105
      });

      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(rule);
      redis.set.mockResolvedValue(undefined);

      const { preview } = await service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' });
      expect(preview.attack).toBe(115);
      expect(preview.defense).toBe(110);
      expect(preview.hp).toBe(110);
      expect(preview.speed).toBe(105);
    });

    it('maxHp in preview equals hp after multiplier', async () => {
      const u1 = makeUnit({ id: 'u1', hp: 200, maxHp: 200 });
      const u2 = makeUnit({ id: 'u2', hp: 200, maxHp: 200 });
      const rule = makeRule({ hpMultiplier: 1.5 }); // 200 * 1.5 = 300

      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(rule);
      redis.set.mockResolvedValue(undefined);

      const { preview } = await service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' });
      expect(preview.hp).toBe(300);
      expect(preview.maxHp).toBe(preview.hp);
    });
  });

  // ── Ability merging ───────────────────────────────────────────────────────

  describe('ability merging', () => {
    it('result contains abilities from both units and bonus abilities', async () => {
      const u1 = makeUnit({ id: 'u1', abilities: ['regeneration'] });
      const u2 = makeUnit({ id: 'u2', abilities: ['berserker'] });
      const rule = makeRule({ bonusAbilities: ['hive_mind'] });

      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(rule);
      redis.set.mockResolvedValue(undefined);

      const { preview } = await service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' });
      expect(preview.abilities).toContain('regeneration');
      expect(preview.abilities).toContain('berserker');
      expect(preview.abilities).toContain('hive_mind');
    });

    it('duplicate abilities are deduplicated in result', async () => {
      const u1 = makeUnit({ id: 'u1', abilities: ['regeneration', 'berserker'] });
      const u2 = makeUnit({ id: 'u2', abilities: ['regeneration'] });
      const rule = makeRule({ bonusAbilities: [] });

      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(rule);
      redis.set.mockResolvedValue(undefined);

      const { preview } = await service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' });
      const count = preview.abilities.filter(a => a === 'regeneration').length;
      expect(count).toBe(1);
    });
  });

  // ── Merge session integrity ───────────────────────────────────────────────

  describe('merge session integrity', () => {
    it('cannot merge a unit with itself', async () => {
      await expect(
        service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a Redis session key on successful merge initiation', async () => {
      const u1 = makeUnit({ id: 'u1' });
      const u2 = makeUnit({ id: 'u2' });
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(makeRule());
      redis.set.mockResolvedValue(undefined);

      const result = await service.initiateMerge({ playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2' });
      expect(result.sessionId).toBeDefined();
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('merge:session:'),
        expect.any(String),
        600,
      );
    });

    it('session contains an expiry timestamp in the future', async () => {
      const u1 = makeUnit({ id: 'u1' });
      const u2 = makeUnit({ id: 'u2' });
      unitsService.assertOwnership.mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);
      mutationService.findRuleForPair.mockResolvedValue(makeRule());
      redis.set.mockResolvedValue(undefined);

      const { expiresAt } = await service.initiateMerge({
        playerId: 'player-1', unit1Id: 'u1', unit2Id: 'u2',
      });
      expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });
});
