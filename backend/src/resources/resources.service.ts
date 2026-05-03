import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceConfig, ResourceType } from './entities/resource-config.entity';
import { PlayerResource } from './entities/player-resource.entity';
import { FeatureFlag } from './entities/feature-flag.entity';
import { PlayerSegment, PlayerSegmentName } from './entities/player-segment.entity';

export interface ResourceSnapshot {
  resourceType: ResourceType;
  amount: number;
  cap: number;
  ratePerHour: number;
  lastCollectedAt: Date;
}

// Cache TTL for resource configs (5 minutes) — hot-reload on admin update clears this
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);
  private configCache: ResourceConfig[] | null = null;
  private configCacheAt = 0;

  constructor(
    @InjectRepository(ResourceConfig)
    private readonly configRepo: Repository<ResourceConfig>,
    @InjectRepository(PlayerResource)
    private readonly playerResourceRepo: Repository<PlayerResource>,
    @InjectRepository(FeatureFlag)
    private readonly featureFlagRepo: Repository<FeatureFlag>,
    @InjectRepository(PlayerSegment)
    private readonly segmentRepo: Repository<PlayerSegment>,
  ) {}

  // ─── Config hot-reload ────────────────────────────────────────────────────

  async reloadConfigs(): Promise<void> {
    this.configCache = null;
    this.configCacheAt = 0;
    this.logger.log('Resource config cache cleared — will reload on next access');
  }

  private async getConfigs(): Promise<ResourceConfig[]> {
    if (this.configCache && Date.now() - this.configCacheAt < CONFIG_CACHE_TTL_MS) {
      return this.configCache;
    }
    this.configCache = await this.configRepo.find({ where: { isActive: true } });
    this.configCacheAt = Date.now();
    return this.configCache;
  }

  private async getConfig(resourceType: ResourceType): Promise<ResourceConfig> {
    const configs = await this.getConfigs();
    const config = configs.find((c) => c.resourceType === resourceType);
    if (!config) throw new NotFoundException(`Resource config not found: ${resourceType}`);
    return config;
  }

  // ─── Feature flag helpers ─────────────────────────────────────────────────

  async getFlagValue(
    flagKey: string,
    segment: PlayerSegmentName = 'f2p',
  ): Promise<Record<string, unknown> | null> {
    const flag = await this.featureFlagRepo.findOne({ where: { flagKey, enabled: true } });
    if (!flag) return null;
    // Segment override takes precedence over base value
    return (flag.segmentOverrides[segment] as Record<string, unknown>) ?? flag.value;
  }

  async upsertFlag(
    flagKey: string,
    value: Record<string, unknown>,
    segmentOverrides: Record<string, Record<string, unknown>> = {},
    description?: string,
  ): Promise<FeatureFlag> {
    const existing = await this.featureFlagRepo.findOne({ where: { flagKey } });
    if (existing) {
      existing.value = value;
      existing.segmentOverrides = segmentOverrides;
      if (description) existing.description = description;
      return this.featureFlagRepo.save(existing);
    }
    const flag = this.featureFlagRepo.create({ flagKey, value, segmentOverrides, description });
    return this.featureFlagRepo.save(flag);
  }

  // ─── Production formula ───────────────────────────────────────────────────

  computeProductionRate(config: ResourceConfig, buildingLevel: number): number {
    // uretim = baz * 1.25^(yapi_seviyesi-1)
    const exponent = Number(config.buildingExponent);
    return Math.floor(config.baseRatePerHour * Math.pow(exponent, buildingLevel - 1));
  }

  computeCap(config: ResourceConfig, age: number): number {
    const multiplier = config.capMultipliers[String(age)] ?? 1;
    return Math.floor(config.capBase * Number(multiplier));
  }

  // ─── Offline accumulation — called on login, no cron ─────────────────────

  async collectOfflineAccumulation(playerId: string): Promise<ResourceSnapshot[]> {
    const playerResources = await this.playerResourceRepo.find({ where: { playerId } });
    if (!playerResources.length) return [];

    const configs = await this.getConfigs();
    const now = new Date();
    const snapshots: ResourceSnapshot[] = [];

    for (const pr of playerResources) {
      const config = configs.find((c) => c.resourceType === pr.resourceType);
      if (!config || pr.resourceType === ResourceType.POPULATION) {
        // Population is slot-based, not time-accumulated
        snapshots.push({
          resourceType: pr.resourceType,
          amount: pr.amount,
          cap: this.computeCap(config ?? ({} as ResourceConfig), pr.currentAge),
          ratePerHour: 0,
          lastCollectedAt: pr.lastCollectedAt,
        });
        continue;
      }

      const elapsedHours = (now.getTime() - new Date(pr.lastCollectedAt).getTime()) / 3_600_000;
      const ratePerHour = this.computeProductionRate(config, pr.buildingLevel);
      const cap = this.computeCap(config, pr.currentAge);
      const earned = Math.floor(elapsedHours * ratePerHour);
      const newAmount = Math.min(pr.amount + earned, cap);

      pr.amount = newAmount;
      pr.lastCollectedAt = now;
      await this.playerResourceRepo.save(pr);

      snapshots.push({ resourceType: pr.resourceType, amount: newAmount, cap, ratePerHour, lastCollectedAt: now });
    }

    this.logger.debug(`Offline accumulation collected for player ${playerId}`);
    return snapshots;
  }

  // ─── Read current resources ───────────────────────────────────────────────

  async getPlayerResources(playerId: string): Promise<ResourceSnapshot[]> {
    const playerResources = await this.playerResourceRepo.find({ where: { playerId } });
    const configs = await this.getConfigs();
    return playerResources.map((pr) => {
      const config = configs.find((c) => c.resourceType === pr.resourceType);
      const ratePerHour = config ? this.computeProductionRate(config, pr.buildingLevel) : 0;
      const cap = config ? this.computeCap(config, pr.currentAge) : 0;
      return { resourceType: pr.resourceType, amount: pr.amount, cap, ratePerHour, lastCollectedAt: pr.lastCollectedAt };
    });
  }

  async deductResources(
    playerId: string,
    deductions: Partial<Record<ResourceType, number>>,
  ): Promise<void> {
    for (const [type, amount] of Object.entries(deductions) as [ResourceType, number][]) {
      const pr = await this.playerResourceRepo.findOne({ where: { playerId, resourceType: type } });
      if (!pr) throw new NotFoundException(`Player resource not found: ${type}`);
      if (pr.amount < amount) {
        throw new Error(`Insufficient ${type}: have ${pr.amount}, need ${amount}`);
      }
      pr.amount -= amount;
      await this.playerResourceRepo.save(pr);
    }
  }

  // ─── Admin: update resource config and hot-reload ─────────────────────────

  async updateConfig(
    resourceType: ResourceType,
    updates: Partial<Pick<ResourceConfig, 'baseRatePerHour' | 'capBase' | 'capMultipliers' | 'buildingExponent'>>,
  ): Promise<ResourceConfig> {
    const config = await this.configRepo.findOne({ where: { resourceType } });
    if (!config) throw new NotFoundException(`Resource config not found: ${resourceType}`);
    Object.assign(config, updates);
    const saved = await this.configRepo.save(config);
    await this.reloadConfigs();
    return saved;
  }

  async getAllConfigs(): Promise<ResourceConfig[]> {
    return this.getConfigs();
  }

  // ─── Player segment ───────────────────────────────────────────────────────

  async getSegment(playerId: string): Promise<PlayerSegmentName> {
    const seg = await this.segmentRepo.findOne({ where: { playerId } });
    return seg?.segment ?? 'f2p';
  }

  async updateSegment(playerId: string, updates: Partial<Omit<PlayerSegment, 'playerId'>>): Promise<void> {
    const existing = await this.segmentRepo.findOne({ where: { playerId } });
    if (existing) {
      Object.assign(existing, updates);
      // Recalculate segment tier from cumulative spend
      const spendCents = existing.cumulativeSpendCents;
      existing.segment = spendCents >= 100000 ? 'whale' : spendCents >= 2000 ? 'mid_spender' : 'f2p';
      await this.segmentRepo.save(existing);
    } else {
      const seg = this.segmentRepo.create({ playerId, ...updates, segment: 'f2p' });
      await this.segmentRepo.save(seg);
    }
  }
}
