import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { InjectRedis } from '../database/redis.provider';
import { EconomyBuildingConfig } from './entities/economy-building-config.entity';
import { EconomyStorageConfig, ResourceType } from './entities/economy-storage-config.entity';
import { EconomyFeatureFlag } from './entities/economy-feature-flag.entity';
import { UpdateBuildingConfigDto } from './dto/update-building-config.dto';
import { UpdateStorageConfigDto } from './dto/update-storage-config.dto';
import { UpsertFeatureFlagDto } from './dto/upsert-feature-flag.dto';

const CACHE_TTL = 300; // 5 minutes — hot enough without DB hammering
const CACHE_KEY_BUILDING = (type: string) => `economy:building:${type}`;
const CACHE_KEY_STORAGE = (type: string) => `economy:storage:${type}`;
const CACHE_KEY_FLAG = (key: string) => `economy:flag:${key}`;
const CACHE_KEY_ALL_BUILDINGS = 'economy:building:all';
const CACHE_KEY_ALL_STORAGE = 'economy:storage:all';

/** Ticks per hour; aligns with 30-second ResourceTickWorker interval */
export const TICKS_PER_HOUR = 120;
export const TICK_INTERVAL_MS = 30_000;

export interface BuildingProductionRates {
  mineralPerTick: number;
  gasPerTick: number;
  netEnergyPerTick: number;
  populationPerTick: number;
}

@Injectable()
export class EconomyService {
  private readonly logger = new Logger(EconomyService.name);

  constructor(
    @InjectRepository(EconomyBuildingConfig)
    private readonly buildingConfigRepo: Repository<EconomyBuildingConfig>,
    @InjectRepository(EconomyStorageConfig)
    private readonly storageConfigRepo: Repository<EconomyStorageConfig>,
    @InjectRepository(EconomyFeatureFlag)
    private readonly featureFlagRepo: Repository<EconomyFeatureFlag>,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  // ── Building configs ─────────────────────────────────────────────────────

  async getBuildingConfig(buildingType: string): Promise<EconomyBuildingConfig | null> {
    const cacheKey = CACHE_KEY_BUILDING(buildingType);
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as EconomyBuildingConfig;

    const config = await this.buildingConfigRepo.findOne({ where: { buildingType } });
    if (config) {
      await this.redis.set(cacheKey, JSON.stringify(config), 'EX', CACHE_TTL);
    }
    return config;
  }

  async getAllBuildingConfigs(): Promise<EconomyBuildingConfig[]> {
    const cached = await this.redis.get(CACHE_KEY_ALL_BUILDINGS);
    if (cached) return JSON.parse(cached) as EconomyBuildingConfig[];

    const configs = await this.buildingConfigRepo.find();
    await this.redis.set(CACHE_KEY_ALL_BUILDINGS, JSON.stringify(configs), 'EX', CACHE_TTL);
    return configs;
  }

  async updateBuildingConfig(buildingType: string, dto: UpdateBuildingConfigDto): Promise<EconomyBuildingConfig> {
    const config = await this.buildingConfigRepo.findOne({ where: { buildingType } });
    if (!config) throw new NotFoundException(`No economy config for building type: ${buildingType}`);

    Object.assign(config, dto);
    const saved = await this.buildingConfigRepo.save(config);

    // Hot-reload: invalidate cache so next request picks up new values
    await this.redis.del(CACHE_KEY_BUILDING(buildingType), CACHE_KEY_ALL_BUILDINGS);
    this.logger.log(`Economy building config hot-reloaded for: ${buildingType}`);
    return saved;
  }

  /**
   * Compute per-tick production rates for a building at a given level.
   * Formula: production = base × exponent^(level-1)
   */
  async computeBuildingRates(buildingType: string, level: number): Promise<BuildingProductionRates> {
    const cfg = await this.getBuildingConfig(buildingType);
    if (!cfg) {
      return { mineralPerTick: 0, gasPerTick: 0, netEnergyPerTick: 0, populationPerTick: 0 };
    }

    const scaleFactor = Math.pow(Number(cfg.levelScaleExponent), level - 1);

    return {
      mineralPerTick:   (Number(cfg.baseMineralPerHour)   * scaleFactor) / TICKS_PER_HOUR,
      gasPerTick:       (Number(cfg.baseGasPerHour)        * scaleFactor) / TICKS_PER_HOUR,
      // Net energy = production scaled - flat consumption (consumption does NOT scale with level)
      netEnergyPerTick: ((Number(cfg.baseEnergyPerHour) * scaleFactor) - Number(cfg.energyConsumptionPerHour)) / TICKS_PER_HOUR,
      populationPerTick:(Number(cfg.basePopulationPerHour) * scaleFactor) / TICKS_PER_HOUR,
    };
  }

  // ── Storage configs ──────────────────────────────────────────────────────

  async getStorageConfig(resourceType: ResourceType): Promise<EconomyStorageConfig | null> {
    const cacheKey = CACHE_KEY_STORAGE(resourceType);
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as EconomyStorageConfig;

    const config = await this.storageConfigRepo.findOne({ where: { resourceType } });
    if (config) {
      await this.redis.set(cacheKey, JSON.stringify(config), 'EX', CACHE_TTL);
    }
    return config;
  }

  async getAllStorageConfigs(): Promise<EconomyStorageConfig[]> {
    const cached = await this.redis.get(CACHE_KEY_ALL_STORAGE);
    if (cached) return JSON.parse(cached) as EconomyStorageConfig[];

    const configs = await this.storageConfigRepo.find();
    await this.redis.set(CACHE_KEY_ALL_STORAGE, JSON.stringify(configs), 'EX', CACHE_TTL);
    return configs;
  }

  async updateStorageConfig(resourceType: ResourceType, dto: UpdateStorageConfigDto): Promise<EconomyStorageConfig> {
    const config = await this.storageConfigRepo.findOne({ where: { resourceType } });
    if (!config) throw new NotFoundException(`No storage config for resource type: ${resourceType}`);

    Object.assign(config, dto);
    const saved = await this.storageConfigRepo.save(config);

    await this.redis.del(CACHE_KEY_STORAGE(resourceType), CACHE_KEY_ALL_STORAGE);
    this.logger.log(`Economy storage config hot-reloaded for: ${resourceType}`);
    return saved;
  }

  /**
   * Returns the storage cap for a given resource at a given age.
   * cap = baseCap × ageMultipliers[age-1]
   */
  async computeStorageCap(resourceType: ResourceType, age: number): Promise<number> {
    const cfg = await this.getStorageConfig(resourceType);
    if (!cfg) return 0;

    const multiplier = Number(cfg.ageMultipliers[age - 1] ?? 1);
    return Math.floor(cfg.baseCap * multiplier);
  }

  // ── Feature flags ────────────────────────────────────────────────────────

  async getFeatureFlag(flagKey: string): Promise<EconomyFeatureFlag | null> {
    const cacheKey = CACHE_KEY_FLAG(flagKey);
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as EconomyFeatureFlag;

    const flag = await this.featureFlagRepo.findOne({ where: { flagKey } });
    if (flag) {
      await this.redis.set(cacheKey, JSON.stringify(flag), 'EX', CACHE_TTL);
    }
    return flag;
  }

  async isFlagEnabled(flagKey: string): Promise<boolean> {
    const flag = await this.getFeatureFlag(flagKey);
    return flag?.enabled ?? false;
  }

  async getFlagVariant(flagKey: string): Promise<string> {
    const flag = await this.getFeatureFlag(flagKey);
    return flag?.variant ?? 'control';
  }

  async getAllFeatureFlags(): Promise<EconomyFeatureFlag[]> {
    return this.featureFlagRepo.find();
  }

  async upsertFeatureFlag(flagKey: string, dto: UpsertFeatureFlagDto): Promise<EconomyFeatureFlag> {
    let flag = await this.featureFlagRepo.findOne({ where: { flagKey } });
    if (!flag) {
      flag = this.featureFlagRepo.create({ flagKey });
    }

    flag.enabled = dto.enabled;
    if (dto.variant !== undefined) flag.variant = dto.variant;
    if (dto.config !== undefined) flag.config = dto.config;
    if (dto.description !== undefined) flag.description = dto.description;

    const saved = await this.featureFlagRepo.save(flag);
    await this.redis.del(CACHE_KEY_FLAG(flagKey));
    this.logger.log(`Feature flag hot-reloaded: ${flagKey} → enabled=${dto.enabled} variant=${saved.variant}`);
    return saved;
  }
}
