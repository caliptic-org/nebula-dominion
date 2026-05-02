import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { PremiumPass } from './entities/premium-pass.entity';
import { UserPremiumPass } from './entities/user-premium-pass.entity';

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);

  constructor(
    @InjectRepository(PremiumPass)
    private readonly passRepository: Repository<PremiumPass>,
    @InjectRepository(UserPremiumPass)
    private readonly userPassRepository: Repository<UserPremiumPass>,
  ) {}

  async getAvailablePasses() {
    return this.passRepository.find({
      where: { isActive: true },
      order: { priceUsd: 'ASC' },
    });
  }

  async getPassByCode(code: string) {
    const pass = await this.passRepository.findOne({ where: { code } });
    if (!pass) throw new NotFoundException(`Premium pass '${code}' bulunamadı`);
    return pass;
  }

  async getUserActivePasses(userId: string) {
    const now = new Date();
    return this.userPassRepository.find({
      where: { userId, status: 'active', expiresAt: MoreThan(now) },
      relations: ['premiumPass'],
    });
  }

  async activatePass(
    userId: string,
    passCode: string,
    paymentProvider: string,
    subscriptionId?: string,
  ): Promise<UserPremiumPass> {
    const pass = await this.passRepository.findOne({ where: { code: passCode } });
    if (!pass) throw new NotFoundException('Premium pass bulunamadı');

    const existingActive = await this.userPassRepository.findOne({
      where: { userId, premiumPassId: pass.id, status: 'active' },
    });
    if (existingActive) {
      throw new BadRequestException('Bu pass zaten aktif');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pass.durationDays);

    const userPass = this.userPassRepository.create({
      userId,
      premiumPassId: pass.id,
      status: 'active',
      expiresAt,
      paymentProvider,
      subscriptionId: subscriptionId ?? null,
    });

    const saved = await this.userPassRepository.save(userPass);
    this.logger.log(`Premium pass aktif: kullanıcı=${userId}, pass=${pass.name}`);
    return saved;
  }

  async addBattlePassXp(userId: string, xpAmount: number): Promise<UserPremiumPass | null> {
    const now = new Date();
    const battlePass = await this.userPassRepository.findOne({
      where: {
        userId,
        status: 'active',
        expiresAt: MoreThan(now),
      },
      relations: ['premiumPass'],
    });

    if (!battlePass || battlePass.premiumPass.passType !== 'battle_pass') {
      return null;
    }

    const XP_PER_TIER = 1000;
    battlePass.tierXp += xpAmount;
    const tiersGained = Math.floor(battlePass.tierXp / XP_PER_TIER);

    if (tiersGained > 0) {
      battlePass.currentTier = Math.min(
        battlePass.currentTier + tiersGained,
        50,
      );
      battlePass.tierXp = battlePass.tierXp % XP_PER_TIER;
    }

    return this.userPassRepository.save(battlePass);
  }

  async claimTierReward(userId: string, userPassId: string, tier: number): Promise<Record<string, unknown>> {
    const userPass = await this.userPassRepository.findOne({
      where: { id: userPassId, userId },
      relations: ['premiumPass'],
    });

    if (!userPass) throw new NotFoundException('Pass bulunamadı');
    if (tier > userPass.currentTier) {
      throw new BadRequestException(`Tier ${tier} henüz açılmadı. Mevcut tier: ${userPass.currentTier}`);
    }

    const alreadyClaimed = userPass.claimedRewards.some(
      (r: Record<string, unknown>) => r.tier === tier,
    );
    if (alreadyClaimed) {
      throw new BadRequestException(`Tier ${tier} ödülü zaten alındı`);
    }

    const tierRewards = userPass.premiumPass.tierRewards as Array<{ tier: number; reward: Record<string, unknown> }>;
    const tierData = tierRewards.find((t) => t.tier === tier);
    if (!tierData) {
      throw new NotFoundException(`Tier ${tier} için ödül tanımlanmamış`);
    }

    userPass.claimedRewards = [
      ...userPass.claimedRewards,
      { tier, claimedAt: new Date(), reward: tierData.reward },
    ];
    await this.userPassRepository.save(userPass);

    this.logger.log(`Tier ödülü alındı: kullanıcı=${userId}, tier=${tier}`);
    return tierData.reward;
  }

  async cancelPass(userId: string, userPassId: string): Promise<UserPremiumPass> {
    const userPass = await this.userPassRepository.findOne({
      where: { id: userPassId, userId, status: 'active' },
    });
    if (!userPass) throw new NotFoundException('Aktif pass bulunamadı');

    userPass.status = 'cancelled';
    userPass.autoRenew = false;
    return this.userPassRepository.save(userPass);
  }

  async checkPremiumStatus(userId: string): Promise<Record<string, unknown>> {
    const activePasses = await this.getUserActivePasses(userId);
    const hasPremium = activePasses.length > 0;
    const hasBattlePass = activePasses.some((p) => p.premiumPass.passType === 'battle_pass');

    const multipliers = activePasses.reduce(
      (acc, pass) => {
        const rewards = pass.premiumPass.rewards as Record<string, unknown>;
        const resMult = (rewards.resource_multiplier as number) || 1;
        const xpMult = (rewards.xp_multiplier as number) || 1;
        return {
          resource: Math.max(acc.resource, resMult),
          xp: Math.max(acc.xp, xpMult),
        };
      },
      { resource: 1, xp: 1 },
    );

    return {
      hasPremium,
      hasBattlePass,
      activePasses: activePasses.map((p) => ({
        id: p.id,
        passName: p.premiumPass.name,
        passType: p.premiumPass.passType,
        expiresAt: p.expiresAt,
        currentTier: p.currentTier,
      })),
      multipliers,
    };
  }
}
