import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { VipService, VIP_PLANS } from '../vip.service';
import { VipSubscription } from '../entities/vip-subscription.entity';
import { VipDailyClaim } from '../entities/vip-daily-claim.entity';
import { createHmac } from 'crypto';

function makeRepo<T>(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn((v) => Promise.resolve(v)),
    update: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    }),
    ...overrides,
  };
}

function makeActiveSub(planId = 'monthly', daysUntilExpiry = 20): VipSubscription {
  const now = new Date();
  const sub = new VipSubscription();
  sub.id = 'sub-1';
  sub.userId = 'user-1';
  sub.planId = planId;
  sub.status = 'active';
  sub.startedAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  sub.expiresAt = new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);
  sub.createdAt = sub.startedAt;
  return sub;
}

describe('VipService', () => {
  let service: VipService;
  let subscriptionRepo: ReturnType<typeof makeRepo>;
  let dailyClaimRepo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    subscriptionRepo = makeRepo();
    dailyClaimRepo = makeRepo();
    service = new VipService(
      subscriptionRepo as any,
      dailyClaimRepo as any,
    );
  });

  // ─── getStatus ───────────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('returns inactive status when no subscription', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);
      dailyClaimRepo.findOne.mockResolvedValue(null);

      const result = await service.getStatus('user-1');

      expect(result.is_active).toBe(false);
      expect(result.vip_level).toBe(0);
      expect(result.expiry_date).toBeNull();
      expect(result.daily_claimed_at).toBeNull();
    });

    it('returns active status with correct VIP level for monthly plan', async () => {
      const sub = makeActiveSub('monthly');
      subscriptionRepo.findOne.mockResolvedValueOnce(sub).mockResolvedValueOnce(null);
      dailyClaimRepo.findOne.mockResolvedValue(null);

      const result = await service.getStatus('user-1');

      expect(result.is_active).toBe(true);
      expect(result.vip_level).toBe(1);
      expect(result.expiry_date).toEqual(sub.expiresAt);
    });

    it('returns vip_level 3 for annual plan', async () => {
      const sub = makeActiveSub('annual', 300);
      subscriptionRepo.findOne.mockResolvedValueOnce(sub).mockResolvedValueOnce(null);
      dailyClaimRepo.findOne.mockResolvedValue(null);

      const result = await service.getStatus('user-1');

      expect(result.vip_level).toBe(3);
    });

    it('marks expired subscription as expired and returns inactive', async () => {
      const sub = makeActiveSub('monthly', -1);
      subscriptionRepo.findOne.mockResolvedValue(sub);

      const result = await service.getStatus('user-1');

      expect(subscriptionRepo.update).toHaveBeenCalledWith(sub.id, { status: 'expired' });
      expect(result.is_active).toBe(false);
    });

    it('includes last claim date when user claimed today', async () => {
      const sub = makeActiveSub('quarterly');
      const claim = new VipDailyClaim();
      claim.claimedAt = new Date();
      subscriptionRepo.findOne.mockResolvedValueOnce(sub);
      dailyClaimRepo.findOne.mockResolvedValue(claim);

      const result = await service.getStatus('user-1');

      expect(result.daily_claimed_at).toEqual(claim.claimedAt);
    });

    it('current_xp grows with elapsed days', async () => {
      const sub = makeActiveSub('monthly');
      subscriptionRepo.findOne.mockResolvedValueOnce(sub).mockResolvedValueOnce(null);
      dailyClaimRepo.findOne.mockResolvedValue(null);

      const result = await service.getStatus('user-1');

      expect(result.current_xp).toBeGreaterThan(0);
      expect(result.next_level_xp).toBe(VIP_PLANS[0].duration_days * 50);
    });
  });

  // ─── getPlans ─────────────────────────────────────────────────────────────────

  describe('getPlans', () => {
    it('returns 3 plans', () => {
      const plans = service.getPlans();
      expect(plans).toHaveLength(3);
    });

    it('includes monthly, quarterly, annual', () => {
      const ids = service.getPlans().map((p) => p.id);
      expect(ids).toContain('monthly');
      expect(ids).toContain('quarterly');
      expect(ids).toContain('annual');
    });

    it('does not expose internal vip_level field', () => {
      const plans = service.getPlans();
      plans.forEach((p) => expect((p as any).vip_level).toBeUndefined());
    });

    it('annual plan has more bonus_gems than quarterly', () => {
      const plans = service.getPlans();
      const annual = plans.find((p) => p.id === 'annual')!;
      const quarterly = plans.find((p) => p.id === 'quarterly')!;
      expect(annual.bonus_gems).toBeGreaterThan(quarterly.bonus_gems);
    });
  });

  // ─── claimDaily ───────────────────────────────────────────────────────────────

  describe('claimDaily', () => {
    it('throws NotFoundException when no active subscription', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);

      await expect(service.claimDaily('user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when subscription is expired', async () => {
      subscriptionRepo.findOne.mockResolvedValue(makeActiveSub('monthly', -1));

      await expect(service.claimDaily('user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns already_claimed=true if claimed within 24h', async () => {
      subscriptionRepo.findOne.mockResolvedValue(makeActiveSub('monthly'));
      const existingClaim = new VipDailyClaim();
      existingClaim.claimedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h ago
      existingClaim.rewards = [{ type: 'gems', amount: 75, label: '75 Gems' }];
      dailyClaimRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existingClaim),
      });

      const result = await service.claimDaily('user-1');

      expect(result.already_claimed).toBe(true);
      expect(result.rewards).toEqual(existingClaim.rewards);
      expect(dailyClaimRepo.save).not.toHaveBeenCalled();
    });

    it('creates claim when not yet claimed today', async () => {
      subscriptionRepo.findOne.mockResolvedValue(makeActiveSub('quarterly'));
      dailyClaimRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      const result = await service.claimDaily('user-1');

      expect(result.already_claimed).toBe(false);
      expect(result.rewards.length).toBeGreaterThan(0);
      expect(dailyClaimRepo.save).toHaveBeenCalled();
    });

    it('next_claim_at is approximately 24h from now', async () => {
      subscriptionRepo.findOne.mockResolvedValue(makeActiveSub('monthly'));
      dailyClaimRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      const before = Date.now();
      const result = await service.claimDaily('user-1');
      const after = Date.now();

      const expectedMs = 24 * 60 * 60 * 1000;
      expect(result.next_claim_at.getTime()).toBeGreaterThanOrEqual(before + expectedMs - 100);
      expect(result.next_claim_at.getTime()).toBeLessThanOrEqual(after + expectedMs + 100);
    });

    it('rewards scale with VIP level (quarterly > monthly)', async () => {
      const runForPlan = async (planId: string) => {
        subscriptionRepo.findOne.mockResolvedValue(makeActiveSub(planId));
        dailyClaimRepo.createQueryBuilder.mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        });
        return service.claimDaily('user-1');
      };

      const monthly = await runForPlan('monthly');
      const quarterly = await runForPlan('quarterly');

      const monthlyGems = monthly.rewards.find((r) => r.type === 'gems')!.amount;
      const quarterlyGems = quarterly.rewards.find((r) => r.type === 'gems')!.amount;
      expect(quarterlyGems).toBeGreaterThan(monthlyGems);
    });
  });

  // ─── purchase ─────────────────────────────────────────────────────────────────

  describe('purchase', () => {
    it('throws ConflictException if user has active subscription', async () => {
      subscriptionRepo.findOne.mockResolvedValue(makeActiveSub('monthly'));

      await expect(service.purchase('user-1', 'quarterly')).rejects.toThrow(ConflictException);
    });

    it('returns checkout_url when no active subscription', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);

      const result = await service.purchase('user-1', 'monthly');

      expect(result.checkout_url).toContain('monthly');
      expect(result.checkout_url).toContain('user-1');
    });

    it('throws NotFoundException for unknown plan', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);

      await expect(service.purchase('user-1', 'diamond')).rejects.toThrow(NotFoundException);
    });

    it('allows purchase when previous subscription is expired', async () => {
      const expiredSub = makeActiveSub('monthly', -5);
      subscriptionRepo.findOne.mockResolvedValue(expiredSub);

      const result = await service.purchase('user-1', 'quarterly');
      expect(result.checkout_url).toBeDefined();
    });
  });

  // ─── processWebhook ───────────────────────────────────────────────────────────

  describe('processWebhook', () => {
    const secret = 'test-webhook-secret';

    beforeEach(() => {
      process.env.PAYMENT_WEBHOOK_SECRET = secret;
    });

    afterEach(() => {
      delete process.env.PAYMENT_WEBHOOK_SECRET;
    });

    function sign(body: string): string {
      return createHmac('sha256', secret).update(body).digest('hex');
    }

    it('throws UnauthorizedException on invalid signature', async () => {
      const body = JSON.stringify({ event: 'payment.completed', user_id: 'u1', plan_id: 'monthly' });
      await expect(service.processWebhook(body, 'bad-sig')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when signature is empty', async () => {
      const body = JSON.stringify({ event: 'payment.completed', user_id: 'u1', plan_id: 'monthly' });
      await expect(service.processWebhook(body, '')).rejects.toThrow(UnauthorizedException);
    });

    it('activates subscription on valid payment.completed webhook', async () => {
      const body = JSON.stringify({ event: 'payment.completed', user_id: 'u1', plan_id: 'quarterly' });
      const sig = sign(body);
      subscriptionRepo.update.mockResolvedValue(undefined);
      subscriptionRepo.save.mockResolvedValue({});

      await service.processWebhook(body, sig);

      expect(subscriptionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', planId: 'quarterly', status: 'active' }),
      );
    });

    it('cancels any prior active subscription before creating new one', async () => {
      const body = JSON.stringify({ event: 'payment.completed', user_id: 'u1', plan_id: 'annual' });
      const sig = sign(body);

      await service.processWebhook(body, sig);

      expect(subscriptionRepo.update).toHaveBeenCalledWith(
        { userId: 'u1', status: 'active' },
        { status: 'cancelled' },
      );
    });

    it('ignores unknown event types without error', async () => {
      const body = JSON.stringify({ event: 'payment.refunded', user_id: 'u1', plan_id: 'monthly' });
      const sig = sign(body);

      await expect(service.processWebhook(body, sig)).resolves.toBeUndefined();
      expect(subscriptionRepo.save).not.toHaveBeenCalled();
    });

    it('throws when PAYMENT_WEBHOOK_SECRET is not configured', async () => {
      delete process.env.PAYMENT_WEBHOOK_SECRET;
      const body = JSON.stringify({ event: 'payment.completed', user_id: 'u1', plan_id: 'monthly' });

      await expect(service.processWebhook(body, 'sig')).rejects.toThrow(UnauthorizedException);
    });

    it('ignores webhook for unknown plan gracefully', async () => {
      const body = JSON.stringify({ event: 'payment.completed', user_id: 'u1', plan_id: 'platinum' });
      const sig = sign(body);

      await expect(service.processWebhook(body, sig)).resolves.toBeUndefined();
      expect(subscriptionRepo.save).not.toHaveBeenCalled();
    });
  });
});
