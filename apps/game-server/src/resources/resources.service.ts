import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { InjectRedis } from '../database/redis.provider';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Resource } from './entities/resource.entity';
import { ResourceCost } from '../buildings/buildings.constants';
import { EconomyService, TICK_INTERVAL_MS } from '../economy/economy.service';

const STORAGE_WARN_THRESHOLD = 0.9;

export interface ResourceSnapshot {
  mineral: number;
  gas: number;
  energy: number;
  population: number;
  mineralCap: number;
  gasCap: number;
  energyCap: number;
  populationCap: number;
  mineralPerTick: number;
  gasPerTick: number;
  energyPerTick: number;
  populationPerTick: number;
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
    private readonly economyService: EconomyService,
    private readonly emitter: EventEmitter2,
  ) {}

  async getOrCreate(playerId: string): Promise<Resource> {
    let resource = await this.resourceRepo.findOne({ where: { playerId } });
    if (!resource) {
      resource = this.resourceRepo.create({ playerId });
      await this.resourceRepo.save(resource);
    }
    return resource;
  }

  /**
   * Returns the player's current resource state.
   * Lazily applies offline accumulation when lastTickAt is stale (≥1 tick ago),
   * replacing the need for a global per-player cron.
   */
  async getSnapshot(playerId: string): Promise<ResourceSnapshot> {
    const resource = await this.getOrCreate(playerId);

    if (resource.lastTickAt) {
      const elapsed = Date.now() - new Date(resource.lastTickAt).getTime();
      if (elapsed >= TICK_INTERVAL_MS) {
        // Stale — apply offline accumulation and return fresh data (bypass cache)
        return this.applyOfflineAccumulation(playerId, resource);
      }
    }

    const cached = await this.redis.get(RESOURCE_CACHE_KEY(playerId));
    if (cached) return JSON.parse(cached) as ResourceSnapshot;

    const snapshot = this.toSnapshot(resource);
    await this.setCache(playerId, snapshot);
    return snapshot;
  }

  /**
   * Calculates and applies all resource production accumulated since lastTickAt.
   * Called on player login and lazily from getSnapshot.
   * Each resource is capped at its current storage limit (CoC behaviour — no overflow loss).
   * Uses a pessimistic_write lock to prevent double-accumulation on concurrent logins.
   */
  async applyOfflineAccumulation(playerId: string, _existingResource?: Resource): Promise<ResourceSnapshot> {
    let result!: ResourceSnapshot;

    await this.resourceRepo.manager.transaction(async (em) => {
      const resource = await em.findOne(Resource, {
        where: { playerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!resource) {
        const newResource = em.create(Resource, { playerId, lastTickAt: new Date() });
        const saved = await em.save(newResource);
        result = this.toSnapshot(saved);
        return;
      }

      if (!resource.lastTickAt) {
        resource.lastTickAt = new Date();
        await em.save(resource);
        result = this.toSnapshot(resource);
        return;
      }

      const now = Date.now();
      const elapsedMs = now - new Date(resource.lastTickAt).getTime();
      const missedTicks = Math.floor(elapsedMs / TICK_INTERVAL_MS);

      if (missedTicks <= 0) {
        result = this.toSnapshot(resource);
        await this.setCache(playerId, result);
        return;
      }

      resource.mineral = Math.min(
        Math.floor(Number(resource.mineral) + Number(resource.mineralPerTick) * missedTicks),
        resource.mineralCap,
      );
      resource.gas = Math.min(
        Math.floor(Number(resource.gas) + Number(resource.gasPerTick) * missedTicks),
        resource.gasCap,
      );
      resource.energy = Math.min(
        Math.floor(Number(resource.energy) + Number(resource.energyPerTick) * missedTicks),
        resource.energyCap,
      );
      resource.population = Math.min(
        Math.floor(Number(resource.population) + Number(resource.populationPerTick) * missedTicks),
        resource.populationCap,
      );

      // Advance lastTickAt by exact ticks applied so fractional remainder carries forward
      resource.lastTickAt = new Date(new Date(resource.lastTickAt).getTime() + missedTicks * TICK_INTERVAL_MS);

      await em.save(resource);
      result = this.toSnapshot(resource);
      await this.setCache(playerId, result);

      this.logger.debug(
        `Offline accumulation applied for ${playerId}: +${missedTicks} ticks (~${Math.round(elapsedMs / 60_000)} min)`,
      );
    });

    return result;
  }

  async canAfford(playerId: string, cost: ResourceCost): Promise<boolean> {
    const snap = await this.getSnapshot(playerId);
    return snap.mineral >= cost.mineral && snap.gas >= cost.gas && snap.energy >= cost.energy;
  }

  async deduct(playerId: string, cost: ResourceCost): Promise<ResourceSnapshot> {
    const resource = await this.getOrCreate(playerId);

    if (
      Number(resource.mineral) < cost.mineral ||
      Number(resource.gas) < cost.gas ||
      Number(resource.energy) < cost.energy
    ) {
      throw new Error(`Insufficient resources for player ${playerId}`);
    }

    resource.mineral = Number(resource.mineral) - cost.mineral;
    resource.gas = Number(resource.gas) - cost.gas;
    resource.energy = Number(resource.energy) - cost.energy;

    await this.resourceRepo.save(resource);
    const snapshot = this.toSnapshot(resource);
    await this.setCache(playerId, snapshot);

    this.logger.debug(`Deducted resources for player ${playerId}: -${cost.mineral}M -${cost.gas}G -${cost.energy}E`);
    return snapshot;
  }

  async updateRates(
    playerId: string,
    rates: {
      mineralPerTick: number;
      gasPerTick: number;
      energyPerTick: number;
      populationPerTick?: number;
    },
  ): Promise<void> {
    const resource = await this.getOrCreate(playerId);
    resource.mineralPerTick = rates.mineralPerTick;
    resource.gasPerTick = rates.gasPerTick;
    resource.energyPerTick = rates.energyPerTick;
    if (rates.populationPerTick !== undefined) {
      resource.populationPerTick = rates.populationPerTick;
    }
    await this.resourceRepo.save(resource);
    await this.invalidateCache(playerId);
    this.logger.debug(
      `Updated production rates for ${playerId}: +${rates.mineralPerTick}M/tick +${rates.gasPerTick}G/tick +${rates.energyPerTick}E/tick`,
    );
  }

  /**
   * Recalculates storage caps when a player advances to a new age.
   * Values come from the DB-driven economy storage config (hot-reloadable).
   */
  async updateStorageCapsForAge(playerId: string, age: number): Promise<void> {
    const resource = await this.getOrCreate(playerId);

    resource.mineralCap    = await this.economyService.computeStorageCap('mineral',    age);
    resource.gasCap        = await this.economyService.computeStorageCap('gas',        age);
    resource.energyCap     = await this.economyService.computeStorageCap('energy',     age);
    resource.populationCap = await this.economyService.computeStorageCap('population', age);

    await this.resourceRepo.save(resource);
    await this.invalidateCache(playerId);
    this.logger.log(
      `Storage caps updated for ${playerId} at Age ${age}: ` +
      `M=${resource.mineralCap} G=${resource.gasCap} E=${resource.energyCap} P=${resource.populationCap}`,
    );
  }

  /** Still available for the cron worker to tick online players */
  async applyTick(playerId: string): Promise<ResourceSnapshot> {
    const resource = await this.getOrCreate(playerId);

    resource.mineral = Math.min(
      Math.floor(Number(resource.mineral) + Number(resource.mineralPerTick)),
      resource.mineralCap,
    );
    resource.gas = Math.min(
      Math.floor(Number(resource.gas) + Number(resource.gasPerTick)),
      resource.gasCap,
    );
    resource.energy = Math.min(
      Math.floor(Number(resource.energy) + Number(resource.energyPerTick)),
      resource.energyCap,
    );
    resource.population = Math.min(
      Math.floor(Number(resource.population) + Number(resource.populationPerTick)),
      resource.populationCap,
    );
    resource.lastTickAt = new Date();

    await this.resourceRepo.save(resource);
    const snapshot = this.toSnapshot(resource);
    await this.setCache(playerId, snapshot);

    this.checkStorageWarning(playerId, snapshot);

    return snapshot;
  }

  /** Emit a storage warning when any resource hits 90% of its cap */
  private checkStorageWarning(playerId: string, snapshot: ResourceSnapshot): void {
    const nearFull: string[] = [];
    if (snapshot.mineral / snapshot.mineralCap >= STORAGE_WARN_THRESHOLD) nearFull.push('mineral');
    if (snapshot.gas / snapshot.gasCap >= STORAGE_WARN_THRESHOLD) nearFull.push('gas');
    if (snapshot.energy / snapshot.energyCap >= STORAGE_WARN_THRESHOLD) nearFull.push('energy');

    if (nearFull.length > 0) {
      this.emitter.emit('resources.storage_near_full', { playerId, nearFull, snapshot });
    }
  }

  async invalidateCache(playerId: string): Promise<void> {
    await this.redis.del(RESOURCE_CACHE_KEY(playerId));
  }

  private toSnapshot(resource: Resource): ResourceSnapshot {
    return {
      mineral:          Math.floor(Number(resource.mineral)),
      gas:              Math.floor(Number(resource.gas)),
      energy:           Math.floor(Number(resource.energy)),
      population:       Math.floor(Number(resource.population)),
      mineralCap:       resource.mineralCap,
      gasCap:           resource.gasCap,
      energyCap:        resource.energyCap,
      populationCap:    resource.populationCap,
      mineralPerTick:   Number(resource.mineralPerTick),
      gasPerTick:       Number(resource.gasPerTick),
      energyPerTick:    Number(resource.energyPerTick),
      populationPerTick:Number(resource.populationPerTick),
      lastTickAt:       resource.lastTickAt,
    };
  }

  private async setCache(playerId: string, snapshot: ResourceSnapshot): Promise<void> {
    await this.redis.set(RESOURCE_CACHE_KEY(playerId), JSON.stringify(snapshot), 'EX', RESOURCE_CACHE_TTL);
  }
}
