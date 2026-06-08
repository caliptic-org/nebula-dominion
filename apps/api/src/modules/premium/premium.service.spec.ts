import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PremiumService } from './premium.service';
import { PremiumPass } from './entities/premium-pass.entity';
import { UserPremiumPass } from './entities/user-premium-pass.entity';

// Mirror of the seeded `battle_pass_season5` tier rewards (subset) — the
// real `type`-discriminated shapes from 004_shop_and_premium.sql.
const TIER_REWARDS = [
  { tier: 1, reward: { type: 'void_crystals', amount: 50 } }, // free
  { tier: 5, reward: { type: 'cosmetic', sku: 'frame_subspace_explorer' } }, // premium
  { tier: 10, reward: { type: 'currency', nebula_coins: 500 } }, // free
  { tier: 15, reward: { type: 'resource_pack', minerals: 10000, energy: 8000 } }, // free
  { tier: 40, reward: { type: 'unit_unlock', unit_code: 'human_dimension_lord' } }, // premium
];

const mockUserPass = (overrides: Partial<any> = {}): any => ({
  id: 'pass-uuid-1',
  userId: 'user-uuid-1',
  currentTier: 50,
  claimedRewards: [],
  premiumPass: { passType: 'battle_pass', tierRewards: TIER_REWARDS },
  ...overrides,
});

describe('PremiumService — MON-3 battle-pass track split', () => {
  let service: PremiumService;
  let passRepo: jest.Mocked<any>;
  let userPassRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;
  let manager: any;

  /** Build a transaction manager; `ownsPremium` controls the user_inventory probe. */
  const buildManager = (userPass: any, ownsPremium: boolean) => ({
    findOne: jest.fn().mockResolvedValue(userPass),
    save: jest.fn().mockImplementation((_entity: any, value: any) => Promise.resolve(value)),
    query: jest.fn().mockImplementation((sql: string) =>
      sql.includes('user_inventory')
        ? ownsPremium
          ? [{ '?column?': 1 }]
          : []
        : [],
    ),
  });

  const makeService = async () => {
    passRepo = { find: jest.fn(), findOne: jest.fn() };
    userPassRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    dataSource = { transaction: jest.fn((fn: any) => fn(manager)), query: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PremiumService,
        { provide: getRepositoryToken(PremiumPass), useValue: passRepo },
        { provide: getRepositoryToken(UserPremiumPass), useValue: userPassRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PremiumService>(PremiumService);
  };

  describe('claimTierReward — premium gate', () => {
    it('blocks a non-owner from claiming a premium-track tier (cosmetic) with 403', async () => {
      manager = buildManager(mockUserPass(), false);
      await makeService();

      await expect(service.claimTierReward('user-uuid-1', 'pass-uuid-1', 5)).rejects.toThrow(
        ForbiddenException,
      );
      // No wallet write should have happened.
      expect(manager.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_currency'),
        expect.anything(),
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('blocks a non-owner from claiming the headline unit-unlock tier with 403', async () => {
      manager = buildManager(mockUserPass(), false);
      await makeService();

      await expect(service.claimTierReward('user-uuid-1', 'pass-uuid-1', 40)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets a non-owner claim a free-track tier and credits void_crystals', async () => {
      manager = buildManager(mockUserPass(), false);
      await makeService();

      const reward = await service.claimTierReward('user-uuid-1', 'pass-uuid-1', 1);

      expect(reward).toEqual({ type: 'void_crystals', amount: 50 });
      // +50 crystals: params are [userId, coins, crystals, gems].
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_currency'),
        ['user-uuid-1', 0, 50, 0],
      );
      expect(manager.save).toHaveBeenCalled();
    });

    it('credits nebula_coins for a free-track currency tier', async () => {
      manager = buildManager(mockUserPass(), false);
      await makeService();

      await service.claimTierReward('user-uuid-1', 'pass-uuid-1', 10);

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_currency'),
        ['user-uuid-1', 500, 0, 0],
      );
    });

    it('records a free non-wallet tier (resource_pack) as claimed without a wallet write', async () => {
      manager = buildManager(mockUserPass(), false);
      await makeService();

      const reward = await service.claimTierReward('user-uuid-1', 'pass-uuid-1', 15);

      expect(reward).toEqual({ type: 'resource_pack', minerals: 10000, energy: 8000 });
      expect(manager.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_currency'),
        expect.anything(),
      );
      expect(manager.save).toHaveBeenCalled();
    });

    it('lets an owner claim a premium-track tier (cosmetic)', async () => {
      manager = buildManager(mockUserPass(), true);
      await makeService();

      const reward = await service.claimTierReward('user-uuid-1', 'pass-uuid-1', 5);

      expect(reward).toEqual({ type: 'cosmetic', sku: 'frame_subspace_explorer' });
      expect(manager.save).toHaveBeenCalled();
    });

    it('still enforces tier-reached before the premium gate', async () => {
      manager = buildManager(mockUserPass({ currentTier: 3 }), false);
      await makeService();

      await expect(service.claimTierReward('user-uuid-1', 'pass-uuid-1', 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an already-claimed tier', async () => {
      manager = buildManager(
        mockUserPass({ claimedRewards: [{ tier: 1, claimedAt: new Date(), reward: {} }] }),
        false,
      );
      await makeService();

      await expect(service.claimTierReward('user-uuid-1', 'pass-uuid-1', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('404s when the pass row is missing', async () => {
      manager = buildManager(null, false);
      await makeService();

      await expect(service.claimTierReward('user-uuid-1', 'missing', 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPassByCode / getAvailablePasses — track annotation', () => {
    beforeEach(async () => {
      manager = buildManager(mockUserPass(), false);
      await makeService();
    });

    it('annotates each battle-pass tier with its track', async () => {
      passRepo.findOne.mockResolvedValue({
        code: 'battle_pass_season5',
        passType: 'battle_pass',
        tierRewards: TIER_REWARDS,
      });

      const pass: any = await service.getPassByCode('battle_pass_season5');
      const byTier = (t: number) => pass.tierRewards.find((x: any) => x.tier === t).track;

      expect(byTier(1)).toBe('free'); // void_crystals
      expect(byTier(5)).toBe('premium'); // cosmetic
      expect(byTier(10)).toBe('free'); // currency
      expect(byTier(15)).toBe('free'); // resource_pack
      expect(byTier(40)).toBe('premium'); // unit_unlock
    });

    it('passes through a non-battle pass (no tierRewards) untouched', async () => {
      passRepo.findOne.mockResolvedValue({ code: 'monthly_pass', passType: 'monthly' });
      const pass: any = await service.getPassByCode('monthly_pass');
      expect(pass.code).toBe('monthly_pass');
      expect(pass.tierRewards).toBeUndefined();
    });

    it('annotates every battle pass returned by getAvailablePasses', async () => {
      passRepo.find.mockResolvedValue([
        { code: 'battle_pass_season5', tierRewards: TIER_REWARDS },
        { code: 'monthly_pass' },
      ]);
      const passes: any[] = await service.getAvailablePasses();
      expect(passes[0].tierRewards.find((x: any) => x.tier === 5).track).toBe('premium');
      expect(passes[1].tierRewards).toBeUndefined();
    });
  });

  describe('FLOW-001 — free-season enrollment', () => {
    const season = { id: 'season-1', code: 'battle_pass_season5', passType: 'battle_pass', durationDays: 90 };

    it('returns the existing active battle-pass enrollment without creating one', async () => {
      manager = {};
      await makeService();
      const existing = { id: 'up-1', premiumPass: { passType: 'battle_pass' } };
      userPassRepo.findOne.mockResolvedValueOnce(existing);

      const result = await service.ensureBattlePassEnrollment('user-1');

      expect(result).toBe(existing);
      expect(userPassRepo.create).not.toHaveBeenCalled();
    });

    it('creates a FREE enrollment (currentTier 0, paymentProvider free) in the active season', async () => {
      manager = {};
      await makeService();
      userPassRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // existing, dup
      passRepo.findOne.mockResolvedValue(season);
      userPassRepo.create.mockImplementation((v: any) => v);
      userPassRepo.save.mockImplementation((v: any) => Promise.resolve({ id: 'up-new', ...v }));

      const result: any = await service.ensureBattlePassEnrollment('user-1');

      expect(userPassRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          premiumPassId: 'season-1',
          status: 'active',
          currentTier: 0,
          tierXp: 0,
          paymentProvider: 'free',
        }),
      );
      expect(result.premiumPassId).toBe('season-1');
    });

    it('returns null when there is no active battle_pass season', async () => {
      manager = {};
      await makeService();
      userPassRepo.findOne.mockResolvedValueOnce(null);
      passRepo.findOne.mockResolvedValue(null);

      const result = await service.ensureBattlePassEnrollment('user-1');

      expect(result).toBeNull();
      expect(userPassRepo.create).not.toHaveBeenCalled();
    });

    it('addBattlePassXp auto-enrolls a passless player, then credits the XP', async () => {
      manager = {};
      await makeService();
      // battlePass query + ensureEnrollment existing/dup checks all miss.
      userPassRepo.findOne.mockResolvedValue(null);
      passRepo.findOne.mockResolvedValue(season);
      userPassRepo.create.mockImplementation((v: any) => ({ ...v }));
      userPassRepo.save.mockImplementation((v: any) => Promise.resolve({ id: 'up-new', ...v }));

      const res: any = await service.addBattlePassXp('user-bpx-1', 100, 'pve_battle', 'battle:bpx-1');

      expect(userPassRepo.create).toHaveBeenCalled(); // enrolled
      expect(res?.xpGranted).toBe(100);
    });
  });

  describe('FLOW-001 pt.2 — premium-track ownership for the FE', () => {
    it('ownsPremiumBattlePass is true when the battle_pass_premium SKU row exists', async () => {
      manager = {};
      await makeService();
      dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      expect(await service.ownsPremiumBattlePass('user-1')).toBe(true);
      // queries user_inventory joined to shop_items for the SKU
      expect(dataSource.query.mock.calls[0][0]).toContain('user_inventory');
      expect(dataSource.query.mock.calls[0][1]).toEqual(['user-1', 'battle_pass_premium']);
    });

    it('ownsPremiumBattlePass is false when no SKU row exists', async () => {
      manager = {};
      await makeService();
      dataSource.query.mockResolvedValue([]);
      expect(await service.ownsPremiumBattlePass('user-1')).toBe(false);
    });

    it('checkPremiumStatus exposes ownsPremiumBattlePass', async () => {
      manager = {};
      await makeService();
      userPassRepo.find.mockResolvedValue([]); // getUserActivePasses
      dataSource.query.mockResolvedValue([{ '?column?': 1 }]); // owns premium SKU
      const status: any = await service.checkPremiumStatus('user-1');
      expect(status.ownsPremiumBattlePass).toBe(true);
      expect(status.hasPremium).toBe(false);
    });
  });
});
