import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac } from 'crypto';
import { VipSubscription } from './entities/vip-subscription.entity';
import { VipDailyClaim, VipReward } from './entities/vip-daily-claim.entity';

export interface VipPlan {
  id: string;
  label: string;
  price_try: number;
  price_usd: number;
  duration_days: number;
  bonus_gems: number;
  vip_level: number;
}

export const VIP_PLANS: VipPlan[] = [
  { id: 'monthly',   label: 'Aylık',   price_try: 179.99,  price_usd: 4.99,  duration_days: 30,  bonus_gems: 0,    vip_level: 1 },
  { id: 'quarterly', label: '3 Aylık', price_try: 449.99,  price_usd: 12.99, duration_days: 90,  bonus_gems: 200,  vip_level: 2 },
  { id: 'annual',    label: 'Yıllık',  price_try: 1399.99, price_usd: 39.99, duration_days: 365, bonus_gems: 1000, vip_level: 3 },
];

const XP_PER_DAY = 50;
const DAILY_CLAIM_HOURS = 24;

@Injectable()
export class VipService {
  private readonly logger = new Logger(VipService.name);

  constructor(
    @InjectRepository(VipSubscription)
    private readonly subscriptionRepo: Repository<VipSubscription>,
    @InjectRepository(VipDailyClaim)
    private readonly dailyClaimRepo: Repository<VipDailyClaim>,
  ) {}

  async getStatus(userId: string) {
    const now = new Date();
    const subscription = await this.subscriptionRepo.findOne({
      where: { userId, status: 'active' },
      order: { expiresAt: 'DESC' },
    });

    if (!subscription) {
      return {
        vip_level: 0,
        current_xp: 0,
        next_level_xp: VIP_PLANS[0].duration_days * XP_PER_DAY,
        expiry_date: null,
        is_active: false,
        daily_claimed_at: null,
      };
    }

    if (subscription.expiresAt <= now) {
      await this.subscriptionRepo.update(subscription.id, { status: 'expired' });
      return {
        vip_level: 0,
        current_xp: 0,
        next_level_xp: VIP_PLANS[0].duration_days * XP_PER_DAY,
        expiry_date: null,
        is_active: false,
        daily_claimed_at: null,
      };
    }

    const plan = VIP_PLANS.find((p) => p.id === subscription.planId)!;
    const elapsedMs = now.getTime() - subscription.startedAt.getTime();
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    const currentXp = Math.min(elapsedDays * XP_PER_DAY, plan.duration_days * XP_PER_DAY);
    const nextLevelXp = plan.duration_days * XP_PER_DAY;

    const lastClaim = await this.dailyClaimRepo.findOne({
      where: { userId },
      order: { claimedAt: 'DESC' },
    });

    return {
      vip_level: plan.vip_level,
      current_xp: currentXp,
      next_level_xp: nextLevelXp,
      expiry_date: subscription.expiresAt,
      is_active: true,
      daily_claimed_at: lastClaim?.claimedAt ?? null,
    };
  }

  getPlans(): Omit<VipPlan, 'vip_level'>[] {
    return VIP_PLANS.map(({ vip_level: _v, ...plan }) => plan);
  }

  async claimDaily(userId: string) {
    const now = new Date();

    const subscription = await this.subscriptionRepo.findOne({
      where: { userId, status: 'active' },
      order: { expiresAt: 'DESC' },
    });

    if (!subscription || subscription.expiresAt <= now) {
      throw new NotFoundException('No active VIP subscription');
    }

    const windowStart = new Date(now.getTime() - DAILY_CLAIM_HOURS * 60 * 60 * 1000);
    const recentClaim = await this.dailyClaimRepo
      .createQueryBuilder('c')
      .where('c.user_id = :userId', { userId })
      .andWhere('c.claimed_at > :windowStart', { windowStart })
      .getOne();

    if (recentClaim) {
      const nextClaimAt = new Date(recentClaim.claimedAt.getTime() + DAILY_CLAIM_HOURS * 60 * 60 * 1000);
      return {
        rewards: recentClaim.rewards,
        already_claimed: true,
        next_claim_at: nextClaimAt,
      };
    }

    const plan = VIP_PLANS.find((p) => p.id === subscription.planId)!;
    const rewards: VipReward[] = [
      { type: 'gems', amount: 50 + plan.vip_level * 25, label: `${50 + plan.vip_level * 25} Gems` },
      { type: 'xp',   amount: 100 * plan.vip_level,     label: `${100 * plan.vip_level} XP` },
    ];

    const claim = this.dailyClaimRepo.create({ userId, claimedAt: now, rewards });
    await this.dailyClaimRepo.save(claim);

    const nextClaimAt = new Date(now.getTime() + DAILY_CLAIM_HOURS * 60 * 60 * 1000);
    return { rewards, already_claimed: false, next_claim_at: nextClaimAt };
  }

  async purchase(userId: string, planId: string): Promise<{ checkout_url: string }> {
    const now = new Date();
    const existing = await this.subscriptionRepo.findOne({
      where: { userId, status: 'active' },
    });

    if (existing && existing.expiresAt > now) {
      throw new ConflictException('User already has an active VIP subscription');
    }

    const plan = VIP_PLANS.find((p) => p.id === planId);
    if (!plan) {
      throw new NotFoundException(`Unknown plan: ${planId}`);
    }

    const paymentBaseUrl = process.env.PAYMENT_GATEWAY_URL ?? 'https://checkout.example.com';
    const params = new URLSearchParams({
      plan: planId,
      user: userId,
      amount: plan.price_usd.toFixed(2),
      currency: 'USD',
    });
    const checkoutUrl = `${paymentBaseUrl}/pay?${params.toString()}`;

    this.logger.log(`Purchase initiated user=${userId} plan=${planId}`);
    return { checkout_url: checkoutUrl };
  }

  async processWebhook(rawBody: string, signature: string): Promise<void> {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('PAYMENT_WEBHOOK_SECRET not configured');
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (expected !== signature) {
      this.logger.warn('Webhook signature mismatch');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    let payload: { event: string; user_id: string; plan_id: string } & Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new Error('Invalid webhook payload');
    }

    if (payload.event === 'payment.completed') {
      const plan = VIP_PLANS.find((p) => p.id === payload.plan_id);
      if (!plan) {
        this.logger.warn(`Unknown plan in webhook: ${payload.plan_id}`);
        return;
      }

      await this.subscriptionRepo.update(
        { userId: payload.user_id, status: 'active' },
        { status: 'cancelled' },
      );

      const now = new Date();
      const expiresAt = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
      const subscription = this.subscriptionRepo.create({
        userId: payload.user_id,
        planId: plan.id,
        status: 'active',
        startedAt: now,
        expiresAt,
      });
      await this.subscriptionRepo.save(subscription);
      this.logger.log(`VIP activated user=${payload.user_id} plan=${plan.id} expires=${expiresAt.toISOString()}`);
    }
  }
}
