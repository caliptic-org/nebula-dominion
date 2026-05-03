import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { ShopController } from '../shop.controller';
import { ShopService } from '../shop.service';
import { Currency, PurchaseStatus, ShopCategory } from '../types/shop.types';
import { AuthenticatedPlayer } from '../../common/guards/player-auth.guard';

const PLAYER: AuthenticatedPlayer = { id: 'player-e2e-1', race: 'insan' };
const IDEMPOTENCY_KEY = 'test-idem-key-001';

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    name: 'Elmas Paketi',
    description: '1.000 gem içerir',
    icon: '💎',
    category: ShopCategory.GENEL,
    gemPrice: null,
    goldPrice: 2400,
    originalGemPrice: null,
    originalGoldPrice: 2800,
    discount: 14,
    stock: null,
    tag: 'best',
    raceExclusive: null,
    bundleContents: ['1000 Gem'],
    featured: true,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ShopController — E2E senaryoları', () => {
  let controller: ShopController;
  let service: jest.Mocked<ShopService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<ShopService>> = {
      getProducts: jest.fn(),
      getPlayerBalance: jest.fn(),
      purchase: jest.fn(),
      getActiveEvents: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [{ provide: ShopService, useValue: mockService }],
    }).compile();

    controller = module.get<ShopController>(ShopController);
    service = module.get<ShopService>(ShopService) as jest.Mocked<ShopService>;
  });

  // ─── /shop route yükleniyor ───────────────────────────────────────────────

  describe('/shop route — ürün listesi', () => {
    it('varsayılan filtre olmadan tüm aktif ürünleri döner', async () => {
      const products = [makeProduct(), makeProduct({ id: 'prod-2', name: 'Altın Paketi' })];
      service.getProducts.mockResolvedValue(products as any);

      const result = await controller.getProducts({});

      expect(service.getProducts).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
    });

    it('ürün listesi gemPrice veya goldPrice içerir', async () => {
      const products = [
        makeProduct({ gemPrice: 100, goldPrice: null }),
        makeProduct({ id: 'prod-2', gemPrice: null, goldPrice: 2400 }),
      ];
      service.getProducts.mockResolvedValue(products as any);

      const result = (await controller.getProducts({})) as typeof products;

      result.forEach((p) => {
        const hasPricing = p.gemPrice !== null || p.goldPrice !== null;
        expect(hasPricing).toBe(true);
      });
    });

    it('tab filtresi ile sadece VIP kategorisi ürünler gelir', async () => {
      const vipProducts = [makeProduct({ category: ShopCategory.VIP })];
      service.getProducts.mockResolvedValue(vipProducts as any);

      await controller.getProducts({ tab: ShopCategory.VIP });

      expect(service.getProducts).toHaveBeenCalledWith({ tab: ShopCategory.VIP });
    });

    it('raceExclusive ürünler için raceMatch alanı eklenir', async () => {
      const products = [
        { ...makeProduct({ raceExclusive: 'insan', raceMatch: true }) },
        { ...makeProduct({ id: 'prod-2', raceExclusive: 'zerg', raceMatch: false }) },
      ];
      service.getProducts.mockResolvedValue(products as any);

      const result = (await controller.getProducts({ race: 'insan' })) as any[];

      expect(result.find((p) => p.raceExclusive === 'insan')?.raceMatch).toBe(true);
      expect(result.find((p) => p.raceExclusive === 'zerg')?.raceMatch).toBe(false);
    });

    it('aktif etkinlikler /events/active endpoint üzerinden listelenir', async () => {
      const events = [{ id: 'ev-1', name: 'Hafta Sonu Etkinliği', endsAt: new Date(Date.now() + 86400000) }];
      service.getActiveEvents.mockResolvedValue(events as any);

      const result = await controller.getActiveEvents();

      expect(result).toEqual(events);
    });
  });

  // ─── Gem bakiyesi güncel ─────────────────────────────────────────────────

  describe('Gem bakiyesi', () => {
    it('oyuncunun güncel gem ve gold bakiyesini döner', async () => {
      service.getPlayerBalance.mockResolvedValue({ gem: 1250, gold: 8400 });

      const result = await controller.getBalance(PLAYER);

      expect(service.getPlayerBalance).toHaveBeenCalledWith(PLAYER.id);
      expect(result).toEqual({ gem: 1250, gold: 8400 });
    });

    it('yeni oyuncu için sıfır bakiye döner', async () => {
      service.getPlayerBalance.mockResolvedValue({ gem: 0, gold: 0 });

      const result = await controller.getBalance({ id: 'new-player' });

      expect(result).toEqual({ gem: 0, gold: 0 });
    });
  });

  // ─── Satın alma akışı ────────────────────────────────────────────────────

  describe('Satın alma — başarılı işlem', () => {
    const dto = { productId: 'prod-1', currency: Currency.GOLD };

    it('başarılı satın alma güncel bakiye döner', async () => {
      const response = {
        transactionId: 'tx-001',
        productId: dto.productId,
        currency: Currency.GOLD,
        amount: 2400,
        balance: { gem: 1250, gold: 6000 },
      };
      service.purchase.mockResolvedValue(response);

      const result = await controller.purchase(PLAYER, dto, IDEMPOTENCY_KEY);

      expect(service.purchase).toHaveBeenCalledWith(PLAYER.id, dto, IDEMPOTENCY_KEY);
      expect(result.transactionId).toBe('tx-001');
      expect(result.balance.gold).toBe(6000);
    });

    it('idempotency-key olmadan BadRequestException fırlatır', async () => {
      await expect(
        controller.purchase(PLAYER, dto, undefined as any),
      ).rejects.toThrow(BadRequestException);

      expect(service.purchase).not.toHaveBeenCalled();
    });

    it('yetersiz bakiyede BadRequestException fırlatır', async () => {
      service.purchase.mockRejectedValue(new BadRequestException('Yetersiz gem bakiyesi'));

      await expect(
        controller.purchase(PLAYER, dto, IDEMPOTENCY_KEY),
      ).rejects.toThrow(BadRequestException);
    });

    it('stok tükenmişse BadRequestException fırlatır', async () => {
      service.purchase.mockRejectedValue(new BadRequestException('Ürün stokta yok'));

      await expect(
        controller.purchase(PLAYER, dto, IDEMPOTENCY_KEY),
      ).rejects.toThrow(BadRequestException);
    });

    it('var olmayan ürün için NotFoundException fırlatır', async () => {
      service.purchase.mockRejectedValue(new NotFoundException('Ürün bulunamadı'));

      await expect(
        controller.purchase(PLAYER, { productId: 'nonexistent', currency: Currency.GEM }, IDEMPOTENCY_KEY),
      ).rejects.toThrow(NotFoundException);
    });

    it('rate limit aşıldığında HttpException fırlatır', async () => {
      service.purchase.mockRejectedValue(new HttpException('Rate limit exceeded', 429));

      await expect(
        controller.purchase(PLAYER, dto, IDEMPOTENCY_KEY),
      ).rejects.toThrow(HttpException);
    });

    it('duplicate idempotency key aynı işlem sonucunu döner', async () => {
      const cachedResponse = {
        transactionId: 'tx-cached',
        productId: dto.productId,
        currency: Currency.GOLD,
        amount: 2400,
        balance: { gem: 1250, gold: 6000 },
      };
      service.purchase.mockResolvedValue(cachedResponse);

      const result = await controller.purchase(PLAYER, dto, IDEMPOTENCY_KEY);

      expect(result.transactionId).toBe('tx-cached');
    });

    it('satın alma sonrası gem bakiyesi azalmış döner', async () => {
      const beforeBalance = { gem: 500, gold: 0 };
      service.getPlayerBalance.mockResolvedValue(beforeBalance);

      service.purchase.mockResolvedValue({
        transactionId: 'tx-002',
        productId: 'gem-product',
        currency: Currency.GEM,
        amount: 100,
        balance: { gem: 400, gold: 0 },
      });

      const purchaseResult = await controller.purchase(
        PLAYER,
        { productId: 'gem-product', currency: Currency.GEM },
        'idem-002',
      );

      expect(purchaseResult.balance.gem).toBeLessThan(beforeBalance.gem);
    });
  });

  // ─── Boundary / Edge case testleri ───────────────────────────────────────

  describe('Boundary değerler', () => {
    it('tam 0 gem bakiyesi olan oyuncu gem ürünü satın alamaz', async () => {
      service.purchase.mockRejectedValue(new BadRequestException('Yetersiz gem bakiyesi'));

      await expect(
        controller.purchase(
          { id: 'broke-player' },
          { productId: 'prod-1', currency: Currency.GEM },
          'idem-000',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('ürün fiyatına tam eşit bakiye ile satın alma başarılı', async () => {
      service.purchase.mockResolvedValue({
        transactionId: 'tx-exact',
        productId: 'prod-exact',
        currency: Currency.GEM,
        amount: 100,
        balance: { gem: 0, gold: 0 },
      });

      const result = await controller.purchase(
        PLAYER,
        { productId: 'prod-exact', currency: Currency.GEM },
        'idem-exact',
      );

      expect(result.balance.gem).toBe(0);
    });
  });
});
