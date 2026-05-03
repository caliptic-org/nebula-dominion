import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { UserInventory } from '../shop/entities/user-inventory.entity';
import { ShopItem } from '../shop/entities/shop-item.entity';
import { UserCurrency } from './entities/user-currency.entity';

const mockShopItem = (overrides: Partial<ShopItem> = {}): ShopItem => ({
  id: 'item-uuid-1',
  sku: 'xp_boost_1h',
  name: '1 Saatlik XP',
  description: '2x XP for 1 hour',
  category: 'xp_booster',
  rarity: 'common',
  priceNebulaCoins: 100,
  priceVoidCrystals: null,
  pricePremiumGems: 20,
  priceRealUsd: null,
  priceRealTry: null,
  content: { multiplier: 2.0, duration_minutes: 60 },
  previewAsset: 'xp_icon.png',
  isLimited: false,
  limitedStock: null,
  stockRemaining: null,
  availableFrom: null,
  availableUntil: null,
  ageRequired: null,
  levelRequired: null,
  isActive: true,
  sortOrder: 0,
  tags: ['boost', 'xp'],
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
} as ShopItem);

const mockInventory = (overrides: Partial<UserInventory> = {}): UserInventory => ({
  id: 'inv-uuid-1',
  userId: 'user-uuid-1',
  shopItemId: 'item-uuid-1',
  shopItem: mockShopItem(),
  quantity: 3,
  acquiredAt: new Date('2025-03-01'),
  source: 'purchase',
  isEquipped: false,
  expiresAt: null,
  createdAt: new Date('2025-03-01'),
  ...overrides,
} as UserInventory);

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepo: jest.Mocked<any>;
  let shopItemRepo: jest.Mocked<any>;
  let currencyRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  const mockQueryBuilder = (result: any = null, count: number = 0) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([result ?? [], count]),
    getMany: jest.fn().mockResolvedValue(result ?? []),
  });

  beforeEach(async () => {
    inventoryRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };
    shopItemRepo = { findOne: jest.fn() };
    currencyRepo = {};

    const mockEntityManager = {
      findOne: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      query: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      }),
    };

    dataSource = {
      transaction: jest.fn((fn) => fn(mockEntityManager)),
    };

    // Store manager reference so tests can override it
    (dataSource as any)._manager = mockEntityManager;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(UserInventory), useValue: inventoryRepo },
        { provide: getRepositoryToken(ShopItem), useValue: shopItemRepo },
        { provide: getRepositoryToken(UserCurrency), useValue: currencyRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('listInventory', () => {
    it('returns paginated inventory items', async () => {
      const inv = mockInventory();
      const qb = mockQueryBuilder([inv], 1);
      inventoryRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listInventory('user-uuid-1', { limit: 20, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('inv-uuid-1');
      expect(result.items[0].category).toBe('tumsu');
      expect(result.items[0].rarity).toBe('siradan');
      expect(result.items[0].canUse).toBe(true);
      expect(result.items[0].canSell).toBe(true);
      expect(result.items[0].sellValue).toBe(2); // 10% of 20 gems
    });

    it('returns empty list for unknown category filter', async () => {
      const qb = mockQueryBuilder([], 0);
      inventoryRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.listInventory('user-uuid-1', { category: 'unknown_cat', limit: 20, offset: 0 });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('filters by Turkish category name', async () => {
      const inv = mockInventory({ shopItem: mockShopItem({ category: 'resource_pack' }) });
      const qb = mockQueryBuilder([inv], 1);
      inventoryRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listInventory('user-uuid-1', { category: 'kaynak', limit: 20, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.items[0].category).toBe('kaynak');
    });

    it('maps rarity correctly for all values', async () => {
      const rarityMap = {
        common: 'siradan', uncommon: 'yaygin', rare: 'nadir',
        epic: 'destansi', legendary: 'efsanevi',
      };
      for (const [dbRarity, turkishRarity] of Object.entries(rarityMap)) {
        const inv = mockInventory({ shopItem: mockShopItem({ rarity: dbRarity }) });
        const qb = mockQueryBuilder([inv], 1);
        inventoryRepo.createQueryBuilder.mockReturnValue(qb);

        const result = await service.listInventory('user-uuid-1', { limit: 20, offset: 0 });
        expect(result.items[0].rarity).toBe(turkishRarity);
      }
    });
  });

  describe('getItem', () => {
    it('returns item detail for owner', async () => {
      inventoryRepo.findOne.mockResolvedValue(mockInventory());

      const result = await service.getItem('user-uuid-1', 'inv-uuid-1');

      expect(result.id).toBe('inv-uuid-1');
      expect(result.name).toBe('1 Saatlik XP');
      expect(result.effects).toEqual([{ type: 'xp_multiplier', value: 2.0, duration: 60 }]);
    });

    it('throws 404 when item not found', async () => {
      inventoryRepo.findOne.mockResolvedValue(null);
      await expect(service.getItem('user-uuid-1', 'missing-uuid')).rejects.toThrow(NotFoundException);
    });

    it('throws 403 when item belongs to different user', async () => {
      inventoryRepo.findOne.mockResolvedValue(mockInventory({ userId: 'other-user' }));
      await expect(service.getItem('user-uuid-1', 'inv-uuid-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('useItem', () => {
    it('decrements quantity and returns effects', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(mockInventory({ quantity: 3 }));
      manager.update.mockResolvedValue({});

      const result = await service.useItem('user-uuid-1', 'inv-uuid-1', 1);

      expect(result.success).toBe(true);
      expect(result.remainingQuantity).toBe(2);
      expect(result.effects[0].type).toBe('xp_multiplier');
      expect(manager.update).toHaveBeenCalledWith(UserInventory, 'inv-uuid-1', { quantity: 2 });
    });

    it('removes item when quantity reaches zero', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(mockInventory({ quantity: 1 }));
      manager.remove.mockResolvedValue({});

      const result = await service.useItem('user-uuid-1', 'inv-uuid-1', 1);

      expect(result.remainingQuantity).toBe(0);
      expect(manager.remove).toHaveBeenCalled();
    });

    it('throws 404 when item not found', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(null);
      await expect(service.useItem('user-uuid-1', 'missing', 1)).rejects.toThrow(NotFoundException);
    });

    it('throws 403 when item belongs to different user', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(mockInventory({ userId: 'other-user' }));
      await expect(service.useItem('user-uuid-1', 'inv-uuid-1', 1)).rejects.toThrow(ForbiddenException);
    });

    it('throws 409 when item is not usable (cosmetic)', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(
        mockInventory({ shopItem: mockShopItem({ category: 'cosmetic_skin' }) }),
      );
      await expect(service.useItem('user-uuid-1', 'inv-uuid-1', 1)).rejects.toThrow(ConflictException);
    });

    it('throws 409 when quantity is insufficient', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(mockInventory({ quantity: 1 }));
      await expect(service.useItem('user-uuid-1', 'inv-uuid-1', 5)).rejects.toThrow(ConflictException);
    });
  });

  describe('sellItem', () => {
    it('decrements quantity and returns gems earned', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(mockInventory({ quantity: 3 }));
      manager.update.mockResolvedValue({});
      manager.query.mockResolvedValue([]);

      const result = await service.sellItem('user-uuid-1', 'inv-uuid-1', 1);

      expect(result.success).toBe(true);
      expect(result.gemsEarned).toBe(2); // 10% of 20 gems price
      expect(result.remainingQuantity).toBe(2);
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        ['user-uuid-1', 2],
      );
    });

    it('removes item when selling all quantity', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(mockInventory({ quantity: 2 }));
      manager.remove.mockResolvedValue({});
      manager.query.mockResolvedValue([]);

      const result = await service.sellItem('user-uuid-1', 'inv-uuid-1', 2);

      expect(result.remainingQuantity).toBe(0);
      expect(manager.remove).toHaveBeenCalled();
    });

    it('throws 409 when item is not sellable (premium_pass)', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(
        mockInventory({ shopItem: mockShopItem({ category: 'premium_pass' }) }),
      );
      await expect(service.sellItem('user-uuid-1', 'inv-uuid-1', 1)).rejects.toThrow(ConflictException);
    });

    it('throws 403 when item belongs to different user', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(mockInventory({ userId: 'other-user' }));
      await expect(service.sellItem('user-uuid-1', 'inv-uuid-1', 1)).rejects.toThrow(ForbiddenException);
    });

    it('throws 409 when quantity is insufficient', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(mockInventory({ quantity: 1 }));
      await expect(service.sellItem('user-uuid-1', 'inv-uuid-1', 10)).rejects.toThrow(ConflictException);
    });

    it('uses rarity-based sell value when no gem price', async () => {
      const manager = (dataSource as any)._manager;
      manager.findOne.mockResolvedValue(
        mockInventory({
          shopItem: mockShopItem({ pricePremiumGems: null, rarity: 'epic' }),
        }),
      );
      manager.update.mockResolvedValue({});
      manager.query.mockResolvedValue([]);

      const result = await service.sellItem('user-uuid-1', 'inv-uuid-1', 1);

      expect(result.gemsEarned).toBe(50); // epic rarity value
    });
  });

  describe('getCapacity', () => {
    it('returns used and max capacity', async () => {
      inventoryRepo.count.mockResolvedValue(12);

      const result = await service.getCapacity('user-uuid-1');

      expect(result.used).toBe(12);
      expect(result.max).toBe(100);
    });
  });

  describe('canUse/canSell flags', () => {
    const usableCats = ['resource_pack', 'xp_booster', 'unit_boost'];
    const nonUsableCats = ['cosmetic_skin', 'cosmetic_banner', 'cosmetic_avatar_frame',
      'cosmetic_trail', 'cosmetic_chat_bubble', 'premium_pass', 'battle_pass_tier_skip', 'currency_bundle'];

    it.each(usableCats)('marks %s as canUse=true', async (cat) => {
      inventoryRepo.findOne.mockResolvedValue(
        mockInventory({ shopItem: mockShopItem({ category: cat }) }),
      );
      const item = await service.getItem('user-uuid-1', 'inv-uuid-1');
      expect(item.canUse).toBe(true);
    });

    it.each(nonUsableCats)('marks %s as canUse=false', async (cat) => {
      inventoryRepo.findOne.mockResolvedValue(
        mockInventory({ shopItem: mockShopItem({ category: cat }) }),
      );
      const item = await service.getItem('user-uuid-1', 'inv-uuid-1');
      expect(item.canUse).toBe(false);
    });

    it.each(['premium_pass', 'battle_pass_tier_skip', 'currency_bundle'])(
      'marks %s as canSell=false',
      async (cat) => {
        inventoryRepo.findOne.mockResolvedValue(
          mockInventory({ shopItem: mockShopItem({ category: cat }) }),
        );
        const item = await service.getItem('user-uuid-1', 'inv-uuid-1');
        expect(item.canSell).toBe(false);
      },
    );
  });
});
