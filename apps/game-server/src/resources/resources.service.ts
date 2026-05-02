import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { InjectRedis } from '../database/redis.provider';
import { Resource } from './entities/resource.entity';
import { ResourceCost } from '../buildings/buildings.constants';

export interface ResourceSnapshot {
  mineral: number;
  gas: number;
  energy: number;
  mineralCap: number;
  gasCap: number;
  energyCap: number;
  mineralPerTick: number;
  gasPerTick: number;
  energyPerTick: number;
  lastTickAt: Date | null;
}

const RESOURCE_CACHE_KEY = (playerId: string) => `player:resources:${playerId}`;
const RESOURCE_CACHE_TTL = 60; // seconds

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async getOrCreate(playerId: string): Promise<Resource> {
    let resource = await this.resourceRepo.findOne({ where: { playerId } });
    if (!resource) {
      resource = this.resourceRepo.create({ playerId });
      await this.resourceRepo.save(resource);
    }
    return resource;
  }

  async getSnapshot(playerId: string): Promise<ResourceSnapshot> {
    const cached = await this.redis.get(RESOURCE_CACHE_KEY(playerId));
    if (cached) {
      return JSON.parse(cached) as ResourceSnapshot;
    }

    const resource = await this.getOrCreate(playerId);
    const snapshot = this.toSnapshot(resource);
    await this.setCache(playerId, snapshot);
    return snapshot;
  }

  async canAfford(playerId: string, cost: ResourceCost): Promise<boolean> {
    const snap = await this.getSnapshot(playerId);
    return snap.mineral >= cost.mineral && snap.gas >= cost.gas && snap.energy >= cost.energy;
  }

  async deduct(playerId: string, cost: ResourceCost): Promise<ResourceSnapshot> {
    const resource = await this.getOrCreate(playerId);

    if (resource.mineral < cost.mineral || resource.gas < cost.gas || resource.energy < cost.energy) {
      throw new Error(`Insufficient resources for player ${playerId}`);
    }

    resource.mineral -= cost.mineral;
    resource.gas -= cost.gas;
    resource.energy -= cost.energy;

    await this.resourceRepo.save(resource);
    const snapshot = this.toSnapshot(resource);
    await this.setCache(playerId, snapshot);

    this.logger.debug(`Deducted resources for player ${playerId}: -${cost.mineral}M -${cost.gas}G -${cost.energy}E`);
    return snapshot;
  }

  async updateRates(
    playerId: string,
    rates: { mineralPerTick: number; gasPerTick: number; energyPerTick: number },
  ): Promise<void> {
    const resource = await this.getOrCreate(playerId);
    resource.mineralPerTick = rates.mineralPerTick;
    resource.gasPerTick = rates.gasPerTick;
    resource.energyPerTick = rates.energyPerTick;
    await this.resourceRepo.save(resource);
    await this.invalidateCache(playerId);
    this.logger.debug(
      `Updated production rates for player ${playerId}: +${rates.mineralPerTick}M/tick +${rates.gasPerTick}G/tick +${rates.energyPerTick}E/tick`,
    );
  }

  async applyTick(playerId: string): Promise<ResourceSnapshot> {
    const resource = await this.getOrCreate(playerId);

    resource.mineral = Math.min(resource.mineral + resource.mineralPerTick, resource.mineralCap);
    resource.gas = Math.min(resource.gas + resource.gasPerTick, resource.gasCap);
    resource.energy = Math.min(resource.energy + resource.energyPerTick, resource.energyCap);
    resource.lastTickAt = new Date();

    await this.resourceRepo.save(resource);
    const snapshot = this.toSnapshot(resource);
    await this.setCache(playerId, snapshot);

    return snapshot;
  }

  async invalidateCache(playerId: string): Promise<void> {
    await this.redis.del(RESOURCE_CACHE_KEY(playerId));
  }

  private toSnapshot(resource: Resource): ResourceSnapshot {
    return {
      mineral: resource.mineral,
      gas: resource.gas,
      energy: resource.energy,
      mineralCap: resource.mineralCap,
      gasCap: resource.gasCap,
      energyCap: resource.energyCap,
      mineralPerTick: resource.mineralPerTick,
      gasPerTick: resource.gasPerTick,
      energyPerTick: resource.energyPerTick,
      lastTickAt: resource.lastTickAt,
    };
  }

  private async setCache(playerId: string, snapshot: ResourceSnapshot): Promise<void> {
    await this.redis.set(RESOURCE_CACHE_KEY(playerId), JSON.stringify(snapshot), 'EX', RESOURCE_CACHE_TTL);
  }
}
