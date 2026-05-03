import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VipTierConfig } from './entities/vip-tier-config.entity';
import { VipSpendLedger } from './entities/vip-spend-ledger.entity';
import { PurchaseEvent } from './entities/purchase-event.entity';

export interface RecordPurchaseResult {
  playerId: string;
  amountCents: number;
  cumulativeSpendCents: number;
  previousVipLevel: number;
  currentVipLevel: number;
  vipUpgraded: boolean;
  benefits: Record<string, unknown>;
}

@Injectable()
export class VipService {
  private readonly logger = new Logger(VipService.name);
  private tierCache: VipTierConfig[] | null = null;

  constructor(
    @InjectRepository(VipTierConfig)
    private readonly tierRepo: Repository<VipTierConfig>,
    @InjectRepository(VipSpendLedger)
    private readonly ledgerRepo: Repository<VipSpendLedger>,
    @InjectRepository(PurchaseEvent)
    private readonly purchaseRepo: Repository<PurchaseEvent>,
    private readonly dataSource: DataSource,
  ) {}

  private async getTiers(): Promise<VipTierConfig[]> {
    if (!this.tierCache) {
      this.tierCache = await this.tierRepo.find({ order: { vipLevel: 'ASC' } });
    }
    return this.tierCache;
  }

  async reloadTiers(): Promise<void> {
    this.tierCache = null;
  }

  private computeVipLevel(spendCents: number, tiers: VipTierConfig[]): number {
    let level = 0;
    for (const tier of tiers) {
      if (spendCents >= tier.thresholdCents) level = tier.vipLevel;
    }
    return level;
  }

  // Atomic: record purchase, update cumulative spend, upgrade VIP tier if threshold crossed
  async recordPurchase(
    playerId: string,
    purchaseType: string,
    amountCents: number,
  ): Promise<RecordPurchaseResult> {
    const tiers = await this.getTiers();

    return this.dataSource.transaction(async (manager) => {
      // Upsert ledger row
      let ledger = await manager.findOne(VipSpendLedger, { where: { playerId } });
      if (!ledger) {
        ledger = manager.create(VipSpendLedger, { playerId, cumulativeSpendCents: 0, currentVipLevel: 0 });
      }

      const previousVipLevel = ledger.currentVipLevel;
      ledger.cumulativeSpendCents += amountCents;
      const newVipLevel = this.computeVipLevel(ledger.cumulativeSpendCents, tiers);
      ledger.currentVipLevel = newVipLevel;
      await manager.save(VipSpendLedger, ledger);

      // Record purchase event for per-user ARPPU telemetry
      const event = manager.create(PurchaseEvent, {
        playerId,
        purchaseType,
        amountCents,
        vipLevelAtPurchase: previousVipLevel,
      });
      await manager.save(PurchaseEvent, event);

      const currentTier = tiers.find((t) => t.vipLevel === newVipLevel);

      if (newVipLevel > previousVipLevel) {
        this.logger.log(`Player ${playerId} VIP upgraded: ${previousVipLevel} → ${newVipLevel}`);
      }

      return {
        playerId,
        amountCents,
        cumulativeSpendCents: ledger.cumulativeSpendCents,
        previousVipLevel,
        currentVipLevel: newVipLevel,
        vipUpgraded: newVipLevel > previousVipLevel,
        benefits: currentTier?.benefits ?? {},
      };
    });
  }

  async getLedger(playerId: string): Promise<VipSpendLedger> {
    const ledger = await this.ledgerRepo.findOne({ where: { playerId } });
    if (!ledger) throw new NotFoundException(`VIP ledger not found for player ${playerId}`);
    return ledger;
  }

  async getBenefits(playerId: string): Promise<Record<string, unknown>> {
    const ledger = await this.ledgerRepo.findOne({ where: { playerId } });
    if (!ledger || ledger.currentVipLevel === 0) return {};
    const tier = (await this.getTiers()).find((t) => t.vipLevel === ledger.currentVipLevel);
    return tier?.benefits ?? {};
  }

  async getAllTiers(): Promise<VipTierConfig[]> {
    return this.getTiers();
  }

  // Per-player ARPPU — not aggregate
  async getArppu(
    playerId: string,
    since?: Date,
  ): Promise<{ totalSpentCents: number; purchaseCount: number; avgPerPurchaseCents: number }> {
    const qb = this.purchaseRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount_cents)', 'totalSpentCents')
      .addSelect('COUNT(*)', 'purchaseCount')
      .where('p.player_id = :playerId', { playerId });

    if (since) qb.andWhere('p.created_at >= :since', { since });

    const raw = await qb.getRawOne<{ totalSpentCents: string; purchaseCount: string }>();
    const total = parseInt(raw?.totalSpentCents ?? '0', 10);
    const count = parseInt(raw?.purchaseCount ?? '0', 10);
    return { totalSpentCents: total, purchaseCount: count, avgPerPurchaseCents: count > 0 ? Math.round(total / count) : 0 };
  }

  async updateTierBenefits(vipLevel: number, benefits: Record<string, unknown>): Promise<VipTierConfig> {
    const tier = await this.tierRepo.findOne({ where: { vipLevel } });
    if (!tier) throw new NotFoundException(`VIP tier ${vipLevel} not found`);
    tier.benefits = benefits;
    const saved = await this.tierRepo.save(tier);
    this.tierCache = null;
    return saved;
  }
}
