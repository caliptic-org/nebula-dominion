import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThan } from 'typeorm';
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
    @InjectDataSource()
    private readonly dataSource: DataSource,
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

    // Credit the reward into the player's wallet BEFORE marking it as
    // claimed — better to retry on a wallet-update failure than to mark
    // claimed and lose the reward entirely. The reward shape supports
    // nebulaCoins / voidCrystals / premiumGems / xp keys (battle-pass
    // tier rewards in the existing pass definitions follow this). Anything
    // outside that set is silently skipped so the tier still completes
    // and the FE toast doesn't lie.
    const reward = tierData.reward as Partial<{
      nebulaCoins: number; voidCrystals: number; premiumGems: number; xp: number;
    }>;
    const coins = Math.max(0, Math.floor(Number(reward.nebulaCoins ?? 0)));
    const crystals = Math.max(0, Math.floor(Number(reward.voidCrystals ?? 0)));
    const gems = Math.max(0, Math.floor(Number(reward.premiumGems ?? 0)));
    if (coins + crystals + gems > 0) {
      // Lazy-init the wallet row (mirrors the shop service pattern) so
      // a player who's never touched the shop still gets their first
      // tier claim credited.
      await this.dataSource.query(
        `INSERT INTO user_currency (user_id) VALUES ($1::uuid)
           ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      );
      await this.dataSource.query(
        `UPDATE user_currency
            SET nebula_coins  = nebula_coins  + $2,
                void_crystals = void_crystals + $3,
                premium_gems  = premium_gems  + $4
          WHERE user_id = $1::uuid`,
        [userId, coins, crystals, gems],
      );
    }

    userPass.claimedRewards = [
      ...userPass.claimedRewards,
      { tier, claimedAt: new Date(), reward: tierData.reward },
    ];
    await this.userPassRepository.save(userPass);

    this.logger.log(
      `Tier ödülü alındı: kullanıcı=${userId}, tier=${tier}, +${coins} coins +${crystals} crystals +${gems} gems`,
    );
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
