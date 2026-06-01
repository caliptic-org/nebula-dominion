import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserVipSpending } from './entities/user-vip-spending.entity';
import { VipTierConfig } from './entities/vip-tier-config.entity';
import { PurchaseTelemetry } from './entities/purchase-telemetry.entity';

interface VipUpgradeResult {
  oldVipLevel: number;
  newVipLevel: number;
  totalSpendUsd: number;
  upgraded: boolean;
}

interface RecordPurchaseDto {
  userId: string;
  transactionId: string | null;
  amountUsd: number | null;
  amountTry: number | null;
  currencyCode: string;
  purchaseType: string;
  countryCode?: string | null;
}

@Injectable()
export class VipService {
  private readonly logger = new Logger(VipService.name);

  constructor(
    @InjectRepository(UserVipSpending)
    private readonly vipSpendingRepo: Repository<UserVipSpending>,
    @InjectRepository(VipTierConfig)
    private readonly vipTierRepo: Repository<VipTierConfig>,
    @InjectRepository(PurchaseTelemetry)
    private readonly telemetryRepo: Repository<PurchaseTelemetry>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // Purchase Recording + VIP Upgrade (atomic)
  // ==========================================

  async recordPurchaseAndUpgradeVip(dto: RecordPurchaseDto): Promise<VipUpgradeResult> {
    const spendUsd = dto.amountUsd ?? this.tryToUsd(dto.amountTry);

    // Get current VIP level before spend for telemetry
    const current = await this.vipSpendingRepo.findOne({ where: { userId: dto.userId } });
    const currentVipLevel = current?.vipLevel ?? 0;

    // Record telemetry first (non-blocking; failure must not break payment)
    await this.recordTelemetry({
      playerId: dto.userId,
      transactionId: dto.transactionId,
      amountUsd: dto.amountUsd,
      amountTry: dto.amountTry,
      currencyCode: dto.currencyCode,
      purchaseType: dto.purchaseType,
      vipLevelAtPurchase: currentVipLevel,
      countryCode: dto.countryCode ?? null,
    });

    if (!spendUsd || spendUsd <= 0) {
      return {
        oldVipLevel: currentVipLevel,
        newVipLevel: currentVipLevel,
        totalSpendUsd: current?.cumulativeSpendUsd ?? 0,
        upgraded: false,
      };
    }

    // Call the atomic SQL function for spend accumulation + tier upgrade
    const rows = await this.dataSource.query<Array<{
      new_vip_level: number;
      old_vip_level: number;
      total_spend: string;
      upgraded: boolean;
    }>>(
      'SELECT new_vip_level, old_vip_level, total_spend, upgraded FROM process_vip_spend($1, $2)',
      [dto.userId, spendUsd],
    );

    const row = rows[0];
    const result: VipUpgradeResult = {
      oldVipLevel: Number(row.old_vip_level),
      newVipLevel: Number(row.new_vip_level),
      totalSpendUsd: parseFloat(row.total_spend),
      upgraded: row.upgraded,
    };

    if (result.upgraded) {
      this.logger.log(
        `VIP yükseltme: kullanıcı=${dto.userId} VIP${result.oldVipLevel}→VIP${result.newVipLevel} toplam=$${result.totalSpendUsd}`,
      );
    }

    return result;
  }

  // ==========================================
  // Daily VIP Reward
  // ==========================================
  //
  // Once-per-day free reward keyed off the player's current VIP tier
  // (higher tier = larger gem grant). 20-hour cooldown — slightly under
  // 24h so the claim window floats with the player's local play time
  // instead of pinning to a UTC midnight that may not match their
  // timezone. last_daily_claim_at column added in migration
  // 1779850000000-AddVipDailyClaim.

  async claimDaily(userId: string): Promise<{
    rewards: { type: 'gems' | 'xp'; amount: number; label: string }[];
    alreadyClaimed: boolean;
    nextClaimAt: string;
  }> {
    const COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20h
    let spending = await this.vipSpendingRepo.findOne({ where: { userId } });
    if (!spending) {
      // First-time claim: lazy-create the spending row at tier 0 so the
      // claim still works for players who have never paid.
      spending = await this.vipSpendingRepo.save(
        this.vipSpendingRepo.create({
          userId,
          cumulativeSpendUsd: 0,
          vipLevel: 0,
          lastUpgradedAt: null,
          lastDailyClaimAt: null,
        }),
      );
    }

    const now = new Date();
    if (spending.lastDailyClaimAt) {
      const since = now.getTime() - spending.lastDailyClaimAt.getTime();
      if (since < COOLDOWN_MS) {
        const nextClaimAt = new Date(spending.lastDailyClaimAt.getTime() + COOLDOWN_MS);
        return {
          rewards: [],
          alreadyClaimed: true,
          nextClaimAt: nextClaimAt.toISOString(),
        };
      }
    }

    // Reward scales with VIP tier — Standard (0) gets the minimum gem
    // grant so the daily claim is meaningful even for never-paid players;
    // higher tiers get progressively more (50 → 80 → 120 → 180 → 250 …).
    const gemReward = 50 + spending.vipLevel * 30;
    const rewards = [
      { type: 'gems' as const, amount: gemReward, label: `${gemReward} 💎` },
    ];

    spending.lastDailyClaimAt = now;
    await this.vipSpendingRepo.save(spending);

    this.logger.log(`VIP günlük ödül: kullanıcı=${userId} VIP${spending.vipLevel} → ${gemReward} gems`);

    // TODO(payment-followup): grant the gems via PremiumCurrency.grant
    // (or whichever shop ledger module handles the gem wallet).  For now
    // the reward is "recorded" — the FE toasts the amount and the player
    // sees confirmation, but the wallet credit is wired in the next
    // commit alongside Battle Pass tier-reward claiming (same ledger).
    return {
      rewards,
      alreadyClaimed: false,
      nextClaimAt: new Date(now.getTime() + COOLDOWN_MS).toISOString(),
    };
  }

  // ==========================================
  // VIP Status Query
  // ==========================================

  async getVipStatus(userId: string): Promise<{
    userId: string;
    vipLevel: number;
    vipLabel: string;
    cumulativeSpendUsd: number;
    nextTierSpendUsd: number | null;
    spendToNextTier: number | null;
    benefits: VipTierConfig['benefits'];
    lastUpgradedAt: Date | null;
  }> {
    const [spending, tiers] = await Promise.all([
      this.vipSpendingRepo.findOne({ where: { userId } }),
      this.vipTierRepo.find({ where: { isActive: true }, order: { vipLevel: 'ASC' } }),
    ]);

    const currentLevel = spending?.vipLevel ?? 0;
    const currentSpend = spending?.cumulativeSpendUsd ?? 0;
    const currentTier = tiers.find((t) => t.vipLevel === currentLevel);
    const nextTier = tiers.find((t) => t.vipLevel === currentLevel + 1) ?? null;

    return {
      userId,
      vipLevel: currentLevel,
      vipLabel: currentTier?.label ?? 'Standard',
      cumulativeSpendUsd: Number(currentSpend),
      nextTierSpendUsd: nextTier ? Number(nextTier.minSpendUsd) : null,
      spendToNextTier: nextTier
        ? Math.max(0, Number(nextTier.minSpendUsd) - Number(currentSpend))
        : null,
      benefits: currentTier?.benefits ?? {
        daily_nebula_coins: 0,
        extra_queue_slots: 0,
        cosmetics: [],
        perks: [],
      },
      lastUpgradedAt: spending?.lastUpgradedAt ?? null,
    };
  }

  // ==========================================
  // Tier Configuration
  // ==========================================

  async getAllTiers(): Promise<VipTierConfig[]> {
    return this.vipTierRepo.find({
      where: { isActive: true },
      order: { vipLevel: 'ASC' },
    });
  }

  async getTierBenefits(vipLevel: number): Promise<VipTierConfig | null> {
    return this.vipTierRepo.findOne({ where: { vipLevel, isActive: true } });
  }

  // ==========================================
  // ARPPU Analytics
  // ==========================================

  async getArppuCohorts(): Promise<Array<{
    vipLevel: number;
    vipLabel: string;
    uniquePayers: number;
    purchaseCount: number;
    totalRevenueUsd: number;
    avgPurchaseUsd: number;
    arppuUsd: number;
  }>> {
    const rows = await this.dataSource.query<Array<{
      vip_level: number;
      vip_label: string;
      unique_payers: string;
      purchase_count: string;
      total_revenue_usd: string;
      avg_purchase_usd: string;
      arppu_usd: string;
    }>>('SELECT * FROM arppu_by_vip_cohort');

    return rows.map((r) => ({
      vipLevel: Number(r.vip_level),
      vipLabel: r.vip_label ?? 'Unknown',
      uniquePayers: Number(r.unique_payers),
      purchaseCount: Number(r.purchase_count),
      totalRevenueUsd: parseFloat(r.total_revenue_usd ?? '0'),
      avgPurchaseUsd: parseFloat(r.avg_purchase_usd ?? '0'),
      arppuUsd: parseFloat(r.arppu_usd ?? '0'),
    }));
  }

  async getUserPurchaseHistory(
    userId: string,
    limit = 20,
  ): Promise<PurchaseTelemetry[]> {
    return this.telemetryRepo.find({
      where: { playerId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ==========================================
  // Internal helpers
  // ==========================================

  private async recordTelemetry(data: {
    playerId: string;
    transactionId: string | null;
    amountUsd: number | null;
    amountTry: number | null;
    currencyCode: string;
    purchaseType: string;
    vipLevelAtPurchase: number;
    countryCode: string | null;
  }): Promise<void> {
    try {
      await this.telemetryRepo.save(
        this.telemetryRepo.create({
          playerId: data.playerId,
          transactionId: data.transactionId,
          purchaseAmountUsd: data.amountUsd,
          purchaseAmountTry: data.amountTry,
          currencyCode: data.currencyCode,
          purchaseType: data.purchaseType,
          vipLevelAtPurchase: data.vipLevelAtPurchase,
          countryCode: data.countryCode,
        }),
      );
    } catch (err: unknown) {
      // Telemetry failure must not break the payment flow
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      this.logger.error(`Telemetri kayıt hatası: kullanıcı=${data.playerId} hata=${msg}`);
    }
  }

  // Approximate TRY→USD conversion (use exchange rate service in production)
  private tryToUsd(amountTry: number | null): number | null {
    if (!amountTry) return null;
    const rate = parseFloat(process.env.TRY_USD_RATE ?? '0.0285');
    return parseFloat((amountTry * rate).toFixed(2));
  }
}
