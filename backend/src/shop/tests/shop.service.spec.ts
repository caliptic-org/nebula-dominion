import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ShopService } from '../shop.service';
import { ShopProduct } from '../entities/shop-product.entity';
import { PlayerWallet } from '../entities/player-wallet.entity';
import { PurchaseTransaction } from '../entities/purchase-transaction.entity';
import { GameEvent } from '../entities/game-event.entity';
import { RedisService } from '../../redis/redis.service';
import { Currency, PurchaseStatus, ShopCategory, ProductTag } from '../types/shop.types';
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';

function makeProduct(overrides: Partial<ShopProduct> = {}): ShopProduct {
  return {
    id: 'prod-uuid-1',
    name: 'Test Product',
    description: 'A test product',
    icon: '💎',
    category: ShopCategory.GENEL,
    gemPrice: 100,
    goldPrice: 800,
    originalGemPrice: null,
    originalGoldPrice: null,
    discount: null,
    stock: null,
    tag: null,
    raceExclusive: null,
    bundleContents: ['Item 1'],
    featured: false,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeWallet(overrides: Partial<PlayerWallet> = {}): PlayerWallet {
  return {
    id: 'wallet-uuid-1',
    playerId: 'player-1',
    gem: 500,
    gold: 5000,
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ShopService', () => {
  let service: ShopService;
  let productRepo: jest.Mocked<any>;
  let walletRepo: jest.Mocked<any>;
  let txRepo: jest.Mocked<any>;
  let eventRepo: jest.Mocked<any>;
  let redisService: jest.Mocked<RedisService>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    productRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    walletRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    txRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    eventRepo = {
      find: jest.fn(),
    };
    redisService = {
      incrWithExpire: jest.fn(),
      ttl: jest.fn(),
    } as any;

    const mockEntityManager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === ShopProduct) return productRepo;
        if (entity === PlayerWallet) return walletRepo;
        if (entity === PurchaseTransaction) return txRepo;
        return {};
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((cb: (em: any) => Promise<any>) =>
        cb(mockEntityManager),
      ),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: getRepositoryToken(ShopProduct), useValue: productRepo },
        { provide: getRepositoryToken(PlayerWallet), useValue: walletRepo },
        { provide: getRepositoryToken(PurchaseTransaction), useValue: txRepo },
        { provide: getRepositoryToken(GameEvent), useValue: eventRepo },
        { provide: RedisService, useValue: redisService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
  });

  describe('getProducts', () => {
    it('returns all active products when no filters provided', async () => {
      const products = [makeProduct()];
      productRepo.find.mockResolvedValue(products);

      const result = await service.getProducts({});

      expect(productRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
      expect(result).toEqual(products);
    });

    it('filters by tab/category', async () => {
      const products = [makeProduct({ category: ShopCategory.VIP })];
      productRepo.find.mockResolvedValue(products);

      await service.getProducts({ tab: ShopCategory.VIP });

      expect(productRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true, category: ShopCategory.VIP } }),
      );
    });

    it('annotates raceMatch when race is provided', async () => {
      const products = [
        makeProduct({ raceExclusive: 'zerg' }),
        makeProduct({ raceExclusive: 'insan' }),
        makeProduct({ raceExclusive: null }),
      ];
      productRepo.find.mockResolvedValue(products);

      const result = await service.getProducts({ race: 'zerg' }) as any[];

      expect(result[0].raceMatch).toBe(true);
      expect(result[1].raceMatch).toBe(false);
      expect(result[2].raceMatch).toBe(true);
    });
  });

  describe('getPlayerBalance', () => {
    it('returns wallet balance for existing player', async () => {
      walletRepo.findOne.mockResolvedValue(makeWallet({ gem: 1250, gold: 8400 }));

      const result = await service.getPlayerBalance('player-1');

      expect(result).toEqual({ gem: 1250, gold: 8400 });
    });

    it('creates wallet with zero balance for new player', async () => {
      walletRepo.findOne.mockResolvedValue(null);
      walletRepo.create.mockReturnValue({ playerId: 'new-player', gem: 0, gold: 0 });
      walletRepo.save.mockResolvedValue({ playerId: 'new-player', gem: 0, gold: 0 });

      const result = await service.getPlayerBalance('new-player');

      expect(walletRepo.create).toHaveBeenCalledWith({ playerId: 'new-player', gem: 0, gold: 0 });
      expect(result).toEqual({ gem: 0, gold: 0 });
    });
  });

  describe('purchase', () => {
    const playerId = 'player-1';
    const idempotencyKey = 'idem-key-123';
    const dto = { productId: 'prod-uuid-1', currency: Currency.GEM };

    beforeEach(() => {
      redisService.incrWithExpire.mockResolvedValue(1);
      txRepo.findOne.mockResolvedValue(null);
    });

    it('throws TooManyRequestsException when rate limit exceeded', async () => {
      redisService.incrWithExpire.mockResolvedValue(11);
      redisService.ttl.mockResolvedValue(45);

      await expect(service.purchase(playerId, dto, idempotencyKey)).rejects.toThrow(
        HttpException,
      );
    });

    it('returns cached result for duplicate idempotency key', async () => {
      const existingTx = {
        id: 'tx-1',
        productId: dto.productId,
        currency: dto.currency,
        amount: 100,
        status: PurchaseStatus.COMPLETED,
      };
      txRepo.findOne.mockResolvedValue(existingTx);
      walletRepo.findOne.mockResolvedValue(makeWallet());

      const result = await service.purchase(playerId, dto, idempotencyKey);

      expect(result.transactionId).toBe('tx-1');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.purchase(playerId, dto, idempotencyKey)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when currency not supported', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct({ gemPrice: null, goldPrice: 800 }));

      await expect(
        service.purchase(playerId, { productId: 'prod-uuid-1', currency: Currency.GEM }, idempotencyKey),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when insufficient balance', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct({ gemPrice: 1000 }));

      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === ShopProduct) return productRepo;
          if (entity === PlayerWallet) {
            return {
              createQueryBuilder: jest.fn().mockReturnValue({
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(makeWallet({ gem: 50 })),
              }),
            };
          }
          if (entity === PurchaseTransaction) return txRepo;
          return {};
        }),
      };

      txRepo.create.mockReturnValue({});
      txRepo.save.mockResolvedValue({});
      (dataSource.transaction as jest.Mock).mockImplementation((cb: any) => cb(mockManager));

      await expect(service.purchase(playerId, dto, idempotencyKey)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('completes purchase and deducts balance', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct({ gemPrice: 100 }));

      const wallet = makeWallet({ gem: 500, gold: 5000 });
      const savedTx = {
        id: 'tx-new',
        productId: dto.productId,
        currency: dto.currency,
        amount: 100,
        status: PurchaseStatus.COMPLETED,
      };

      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === ShopProduct) {
            return {
              ...productRepo,
              createQueryBuilder: jest.fn().mockReturnValue({
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                execute: jest.fn(),
              }),
            };
          }
          if (entity === PlayerWallet) {
            return {
              createQueryBuilder: jest.fn().mockReturnValue({
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(wallet),
              }),
              update: jest.fn().mockResolvedValue({ affected: 1 }),
            };
          }
          if (entity === PurchaseTransaction) {
            return {
              create: jest.fn().mockReturnValue(savedTx),
              save: jest.fn().mockResolvedValue(savedTx),
            };
          }
          return {};
        }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation((cb: any) => cb(mockManager));

      const result = await service.purchase(playerId, dto, idempotencyKey);

      expect(result.transactionId).toBe('tx-new');
      expect(result.balance.gem).toBe(400);
      expect(result.balance.gold).toBe(5000);
    });

    it('throws BadRequestException for out-of-stock product', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct({ gemPrice: 100, stock: 0 }));

      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === ShopProduct) {
            return {
              createQueryBuilder: jest.fn().mockReturnValue({
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 0 }),
              }),
            };
          }
          if (entity === PlayerWallet) {
            return {
              createQueryBuilder: jest.fn().mockReturnValue({
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(makeWallet({ gem: 500 })),
              }),
            };
          }
          if (entity === PurchaseTransaction) return txRepo;
          return {};
        }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation((cb: any) => cb(mockManager));

      await expect(service.purchase(playerId, dto, idempotencyKey)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getActiveEvents', () => {
    it('returns only active events that have not expired', async () => {
      const events = [{ id: 'event-1', name: 'Test Event', endsAt: new Date(Date.now() + 86400000) }];
      eventRepo.find.mockResolvedValue(events);

      const result = await service.getActiveEvents();

      expect(result).toEqual(events);
      expect(eventRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });
});
