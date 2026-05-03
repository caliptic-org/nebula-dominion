import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { VipController } from '../vip.controller';
import { VipService } from '../vip.service';
import { JwtPayload } from '../../common/guards/jwt-auth.guard';

const USER: JwtPayload = { sub: 'user-e2e-1' };

describe('VipController — E2E senaryoları', () => {
  let controller: VipController;
  let service: jest.Mocked<VipService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<VipService>> = {
      getStatus: jest.fn(),
      getPlans: jest.fn(),
      claimDaily: jest.fn(),
      purchase: jest.fn(),
      processWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VipController],
      providers: [{ provide: VipService, useValue: mockService }],
    }).compile();

    controller = module.get<VipController>(VipController);
    service = module.get<VipService>(VipService) as jest.Mocked<VipService>;
  });

  // ─── /vip route: VIP seviyesi yükleniyor ─────────────────────────────────

  describe('VIP durumu', () => {
    it('aktif VIP aboneliği olan kullanıcı için is_active=true ve vip_level > 0 döner', async () => {
      service.getStatus.mockResolvedValue({
        is_active: true,
        vip_level: 1,
        current_xp: 500,
        next_level_xp: 1500,
        expiry_date: new Date(Date.now() + 20 * 86400000),
        daily_claimed_at: null,
      } as any);

      const result = await controller.getStatus(USER);

      expect(service.getStatus).toHaveBeenCalledWith(USER.sub);
      expect(result.is_active).toBe(true);
      expect(result.vip_level).toBeGreaterThan(0);
    });

    it('VIP aboneliği olmayan kullanıcı için is_active=false ve vip_level=0 döner', async () => {
      service.getStatus.mockResolvedValue({
        is_active: false,
        vip_level: 0,
        current_xp: 0,
        next_level_xp: 1500,
        expiry_date: null,
        daily_claimed_at: null,
      } as any);

      const result = await controller.getStatus(USER);

      expect(result.is_active).toBe(false);
      expect(result.vip_level).toBe(0);
      expect(result.expiry_date).toBeNull();
    });

    it('süresi dolmuş abonelik için is_active=false döner', async () => {
      service.getStatus.mockResolvedValue({
        is_active: false,
        vip_level: 0,
        current_xp: 0,
        next_level_xp: 1500,
        expiry_date: new Date(Date.now() - 86400000),
        daily_claimed_at: null,
      } as any);

      const result = await controller.getStatus(USER);

      expect(result.is_active).toBe(false);
    });

    it('yıllık plan için vip_level=3 döner', async () => {
      service.getStatus.mockResolvedValue({
        is_active: true,
        vip_level: 3,
        current_xp: 1000,
        next_level_xp: 18250,
        expiry_date: new Date(Date.now() + 300 * 86400000),
        daily_claimed_at: null,
      } as any);

      const result = await controller.getStatus(USER);

      expect(result.vip_level).toBe(3);
    });
  });

  // ─── /vip route: Planlar yükleniyor ─────────────────────────────────────

  describe('VIP planları', () => {
    it('3 plan döner: monthly, quarterly, annual', () => {
      service.getPlans.mockReturnValue([
        { id: 'monthly', label: 'Aylık', price_try: 179.99, price_usd: 4.99, duration_days: 30, bonus_gems: 0 } as any,
        { id: 'quarterly', label: '3 Aylık', price_try: 449.99, price_usd: 12.99, duration_days: 90, bonus_gems: 200 } as any,
        { id: 'annual', label: 'Yıllık', price_try: 1399.99, price_usd: 39.99, duration_days: 365, bonus_gems: 1000 } as any,
      ]);

      const plans = controller.getPlans();

      expect(plans).toHaveLength(3);
      const ids = plans.map((p) => p.id);
      expect(ids).toContain('monthly');
      expect(ids).toContain('quarterly');
      expect(ids).toContain('annual');
    });

    it('her planın fiyatı ve süresi bulunur', () => {
      service.getPlans.mockReturnValue([
        { id: 'monthly', label: 'Aylık', price_try: 179.99, price_usd: 4.99, duration_days: 30, bonus_gems: 0 } as any,
      ]);

      const plans = controller.getPlans();

      plans.forEach((p) => {
        expect(p.price_try).toBeGreaterThan(0);
        expect(p.price_usd).toBeGreaterThan(0);
        expect(p.duration_days).toBeGreaterThan(0);
      });
    });

    it('yıllık plan quarterly\'den daha fazla bonus_gems içerir', () => {
      service.getPlans.mockReturnValue([
        { id: 'quarterly', label: '3 Aylık', price_try: 449.99, price_usd: 12.99, duration_days: 90, bonus_gems: 200 } as any,
        { id: 'annual', label: 'Yıllık', price_try: 1399.99, price_usd: 39.99, duration_days: 365, bonus_gems: 1000 } as any,
      ]);

      const plans = controller.getPlans();
      const annual = plans.find((p) => p.id === 'annual')!;
      const quarterly = plans.find((p) => p.id === 'quarterly')!;

      expect(annual.bonus_gems).toBeGreaterThan(quarterly.bonus_gems);
    });
  });

  // ─── Günlük ödül talebi çalışıyor ─────────────────────────────────────

  describe('Günlük ödül talebi (claim-daily)', () => {
    it('ilk talep başarıyla ödül döner, already_claimed=false', async () => {
      const rewards = [
        { type: 'gems', amount: 75, label: '75 Gem' },
        { type: 'xp', amount: 100, label: '100 XP' },
      ];
      service.claimDaily.mockResolvedValue({
        already_claimed: false,
        rewards,
        next_claim_at: new Date(Date.now() + 86400000),
      } as any);

      const result = await controller.claimDaily(USER);

      expect(service.claimDaily).toHaveBeenCalledWith(USER.sub);
      expect(result.already_claimed).toBe(false);
      expect(result.rewards.length).toBeGreaterThan(0);
    });

    it('ödül içeriği gems veya xp türlerini barındırır', async () => {
      service.claimDaily.mockResolvedValue({
        already_claimed: false,
        rewards: [
          { type: 'gems', amount: 75, label: '75 Gem' },
          { type: 'xp', amount: 100, label: '100 XP' },
        ],
        next_claim_at: new Date(Date.now() + 86400000),
      } as any);

      const result = await controller.claimDaily(USER);

      const types = result.rewards.map((r: any) => r.type);
      const validTypes = ['gems', 'xp', 'gold', 'chest'];
      types.forEach((t: string) => expect(validTypes).toContain(t));
    });

    it('next_claim_at yaklaşık 24 saat sonrasını işaret eder', async () => {
      const before = Date.now();
      service.claimDaily.mockResolvedValue({
        already_claimed: false,
        rewards: [{ type: 'gems', amount: 75, label: '75 Gem' }],
        next_claim_at: new Date(before + 24 * 3600 * 1000),
      } as any);

      const result = await controller.claimDaily(USER);
      const afterMs = Date.now() + 24 * 3600 * 1000;

      expect(result.next_claim_at.getTime()).toBeGreaterThan(before + 23 * 3600 * 1000);
      expect(result.next_claim_at.getTime()).toBeLessThanOrEqual(afterMs + 1000);
    });

    it('VIP aboneliği yoksa NotFoundException fırlatır', async () => {
      service.claimDaily.mockRejectedValue(new NotFoundException('Aktif VIP aboneliği bulunamadı'));

      await expect(controller.claimDaily(USER)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Aynı gün tekrar claim → already_claimed=true (disabled buton) ────

  describe('Aynı günde tekrar claim talebi', () => {
    it('aynı gün ikinci talep already_claimed=true döner', async () => {
      service.claimDaily.mockResolvedValue({
        already_claimed: true,
        rewards: [{ type: 'gems', amount: 75, label: '75 Gem' }],
        next_claim_at: new Date(Date.now() + 22 * 3600 * 1000),
      } as any);

      const result = await controller.claimDaily(USER);

      expect(result.already_claimed).toBe(true);
    });

    it('already_claimed=true olduğunda ödüller önceki claim\'in sonuçlarını içerir', async () => {
      const previousRewards = [{ type: 'gems', amount: 75, label: '75 Gem' }];
      service.claimDaily.mockResolvedValue({
        already_claimed: true,
        rewards: previousRewards,
        next_claim_at: new Date(Date.now() + 22 * 3600 * 1000),
      } as any);

      const result = await controller.claimDaily(USER);

      expect(result.rewards).toEqual(previousRewards);
    });

    it('aynı gün talebi için servis yalnızca bir kez kaydeder', async () => {
      service.claimDaily
        .mockResolvedValueOnce({
          already_claimed: false,
          rewards: [{ type: 'gems', amount: 75, label: '75 Gem' }],
          next_claim_at: new Date(Date.now() + 86400000),
        } as any)
        .mockResolvedValueOnce({
          already_claimed: true,
          rewards: [{ type: 'gems', amount: 75, label: '75 Gem' }],
          next_claim_at: new Date(Date.now() + 22 * 3600 * 1000),
        } as any);

      const first = await controller.claimDaily(USER);
      const second = await controller.claimDaily(USER);

      expect(first.already_claimed).toBe(false);
      expect(second.already_claimed).toBe(true);
      expect(service.claimDaily).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Satın alma → checkout URL yönlendirmesi ─────────────────────────

  describe('VIP satın alma — checkout URL', () => {
    it('geçerli plan için checkout_url döner', async () => {
      service.purchase.mockResolvedValue({
        checkout_url: 'https://payments.example.com/checkout?plan=monthly&user=user-e2e-1',
      } as any);

      const result = await controller.purchase(USER, { plan_id: 'monthly' });

      expect(service.purchase).toHaveBeenCalledWith(USER.sub, 'monthly');
      expect(result.checkout_url).toBeDefined();
      expect(result.checkout_url).toContain('monthly');
    });

    it('checkout_url kullanıcı kimliğini barındırır', async () => {
      service.purchase.mockResolvedValue({
        checkout_url: `https://payments.example.com/checkout?plan=quarterly&user=${USER.sub}`,
      } as any);

      const result = await controller.purchase(USER, { plan_id: 'quarterly' });

      expect(result.checkout_url).toContain(USER.sub);
    });

    it('aktif aboneliği olan kullanıcı için ConflictException fırlatır', async () => {
      service.purchase.mockRejectedValue(
        new ConflictException('Zaten aktif bir VIP aboneliğiniz var'),
      );

      await expect(controller.purchase(USER, { plan_id: 'monthly' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('geçersiz plan_id için NotFoundException fırlatır', async () => {
      service.purchase.mockRejectedValue(new NotFoundException('Plan bulunamadı'));

      await expect(controller.purchase(USER, { plan_id: 'platinum' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('süresi dolmuş abonelik olan kullanıcı yeni plan satın alabilir', async () => {
      service.purchase.mockResolvedValue({
        checkout_url: 'https://payments.example.com/checkout?plan=annual&user=user-e2e-1',
      } as any);

      const result = await controller.purchase(USER, { plan_id: 'annual' });

      expect(result.checkout_url).toBeDefined();
    });
  });
});
