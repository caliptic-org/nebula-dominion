import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Redis from 'ioredis';
import { InjectRedis } from '../database/redis.provider';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Resource } from './entities/resource.entity';
import { ResourceCost } from '../buildings/buildings.constants';
import { EconomyService, TICK_INTERVAL_MS } from '../economy/economy.service';

export interface ResourceSnapshot {
  mineral: number;
  gas: number;
  energy: number;
  population: number;
  /** Science points — earned from battles and garrisoned galaxy nodes */
  science: number;
  mineralCap: number;
  gasCap: number;
  energyCap: number;
  populationCap: number;
  scienceCap: number;
  mineralPerTick: number;
  gasPerTick: number;
  energyPerTick: number;
  populationPerTick: number;
  /** Science produced per tick — cycle 17 BAL-02 lab trickle */
  sciencePerTick: number;
  lastTickAt: Date | null;
}

const RESOURCE_CACHE_KEY = (playerId: string) => `player:resources:${playerId}`;
const RESOURCE_CACHE_TTL = 60; // seconds

/** Threshold (fraction of cap) at which a storage-near-full warning is emitted */
const STORAGE_WARN_THRESHOLD = 0.9;

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
    private readonly dataSource: DataSource,
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
      // Cycle 17 BAL-02: offline players also accrue lab science over the
      // missed ticks so the trickle keeps pace whether online or offline.
      resource.science = Math.min(
        Math.floor(Number(resource.science ?? 0) + Number(resource.sciencePerTick ?? 0) * missedTicks),
        Number(resource.scienceCap ?? Number.MAX_SAFE_INTEGER),
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
    if (snap.mineral < cost.mineral) return false;
    if (snap.gas     < cost.gas)     return false;
    if (snap.energy  < cost.energy)  return false;
    // Science is opt-in on ResourceCost (Lv 5+ building upgrades start
    // charging it). Older call-sites omit the field; only enforce when
    // explicitly set.
    if (cost.science && snap.science < cost.science) return false;
    return true;
  }

  /**
   * Atomically credits the player's wallet with `amounts`, clamping each
   * resource to its current cap inline via LEAST(...). Mirrors the
   * deduct() atomic contract — two concurrent grants on the same row
   * cannot both read-modify-write the balance because the UPDATE runs
   * as a single statement with row-level lock.
   *
   * Pre-fix flow ran getOrCreate → mutate in memory → repo.save(), which
   * was the symmetric race to deduct (last write wins, one grant
   * dropped). Caps are honoured via LEAST so granting past the cap is a
   * no-op rather than overflow, matching the prior Math.min behaviour
   * exactly.
   */
  async grant(
    playerId: string,
    amounts: Partial<ResourceCost>,
  ): Promise<ResourceSnapshot> {
    await this.getOrCreate(playerId);

    const mineralGrant = Math.max(0, Math.floor(Number(amounts.mineral) || 0));
    const gasGrant     = Math.max(0, Math.floor(Number(amounts.gas)     || 0));
    const energyGrant  = Math.max(0, Math.floor(Number(amounts.energy)  || 0));
    const scienceGrant = Math.max(0, Math.floor(Number(amounts.science) || 0));

    // No-op when every grant is zero — preserve previous behaviour where
    // an empty grant just returned the current snapshot.
    if (mineralGrant === 0 && gasGrant === 0 && energyGrant === 0 && scienceGrant === 0) {
      return this.getSnapshot(playerId);
    }

    const rows = (await this.dataSource.query(
      `
      UPDATE player_resources
         SET mineral = LEAST(mineral_cap,  FLOOR(mineral + $2)),
             gas     = LEAST(gas_cap,      FLOOR(gas     + $3)),
             energy  = LEAST(energy_cap,   FLOOR(energy  + $4)),
             science = LEAST(science_cap,  FLOOR(science + $5))
       WHERE player_id = $1
      RETURNING id, player_id, mineral, gas, energy, population, science,
                mineral_cap, gas_cap, energy_cap, population_cap, science_cap,
                mineral_per_tick, gas_per_tick, energy_per_tick, population_per_tick,
                science_per_tick, last_tick_at
      `,
      [playerId, mineralGrant, gasGrant, energyGrant, scienceGrant],
    )) as Array<{
      id: string;
      player_id: string;
      mineral: string | number;
      gas: string | number;
      energy: string | number;
      population: string | number;
      science: string | number;
      mineral_cap: string | number;
      gas_cap: string | number;
      energy_cap: string | number;
      population_cap: string | number;
      science_cap: string | number;
      mineral_per_tick: string | number;
      gas_per_tick: string | number;
      energy_per_tick: string | number;
      population_per_tick: string | number;
      science_per_tick: string | number;
      last_tick_at: Date | null;
    }>;

    if (rows.length === 0) {
      // Should be unreachable — getOrCreate just guaranteed the row.
      // Fall back to a fresh snapshot read so we don't 500 if some
      // upstream nuked the row between the two statements.
      return this.getSnapshot(playerId);
    }

    const r = rows[0];
    const snapshot: ResourceSnapshot = {
      mineral:           Math.floor(Number(r.mineral)),
      gas:               Math.floor(Number(r.gas)),
      energy:            Math.floor(Number(r.energy)),
      population:        Math.floor(Number(r.population)),
      science:           Math.floor(Number(r.science ?? 0)),
      mineralCap:        Number(r.mineral_cap),
      gasCap:            Number(r.gas_cap),
      energyCap:         Number(r.energy_cap),
      populationCap:     Number(r.population_cap),
      scienceCap:        Number(r.science_cap ?? 999999),
      mineralPerTick:    Number(r.mineral_per_tick),
      gasPerTick:        Number(r.gas_per_tick),
      energyPerTick:     Number(r.energy_per_tick),
      populationPerTick: Number(r.population_per_tick),
      sciencePerTick:    Number(r.science_per_tick ?? 0),
      lastTickAt:        r.last_tick_at,
    };

    await this.setCache(playerId, snapshot);

    this.logger.debug(
      `Granted resources to player ${playerId}: +${mineralGrant}M +${gasGrant}G +${energyGrant}E +${scienceGrant}◈`,
    );
    return snapshot;
  }

  /**
   * Atomically debits the player's wallet by `cost` using a single
   * conditional UPDATE — the WHERE predicate forces row-level
   * serialization in Postgres so two concurrent POSTs cannot both
   * read the same balance, subtract, and last-write-wins the save.
   *
   * Pre-fix flow (ECON-CYC10-DEDUCT-RACE-01): getOrCreate() did a plain
   * findOne (no FOR UPDATE), the service subtracted in memory, then
   * repo.save() wrote back the row. N parallel POST /buildings or
   * POST /units/train would all read balance B, all compute B-cost,
   * and all save B-cost → only ONE deduction was persisted but every
   * building/unit insert still succeeded (those inserts don't race on
   * player_resources). Scripted clients could buy N actions for ~1× cost.
   *
   * Post-fix flow: one conditional UPDATE with the cost inlined into the
   * WHERE clause. If the balance is short by the time the UPDATE runs,
   * Postgres returns 0 rows and we throw BadRequestException("Yetersiz
   * kaynak"). If 1 row, the row is debited and RETURNING gives us the
   * new balance for the snapshot + cache refresh. Two concurrent calls
   * with cost=50 against balance=100: first UPDATE acquires the row lock
   * and writes mineral=50, second UPDATE re-checks the predicate
   * mineral>=50 against the freshly written 50 (passes once it grabs
   * the lock) — third call sees mineral=0 < 50 → 0 rows → 4xx.
   *
   * Signature is backward compatible — return type still
   * Promise<ResourceSnapshot> so existing callers in buildings.service,
   * units.service, and bases.service work unchanged.
   */
  async deduct(playerId: string, cost: ResourceCost): Promise<ResourceSnapshot> {
    // Guarantee a row exists for the conditional UPDATE to target.
    // getOrCreate() races on first-create are harmless: both attempts
    // hit the unique(player_id) index, one wins, the other re-reads.
    // Subsequent deduct calls on the same row are the ones that need
    // the atomic guarantee, and the UPDATE below provides it.
    await this.getOrCreate(playerId);

    const mineralCost = Math.max(0, Number(cost.mineral) || 0);
    const gasCost = Math.max(0, Number(cost.gas) || 0);
    const energyCost = Math.max(0, Number(cost.energy) || 0);
    const scienceCost = Math.max(0, Number(cost.science) || 0);

    // Single round-trip: predicate forces serialization, RETURNING gives
    // us the full row for snapshot + cache priming without a follow-up
    // SELECT. Numeric columns come back as strings — toSnapshot handles
    // the coercion via Number().
    const rows = (await this.dataSource.query(
      `
      UPDATE player_resources
         SET mineral = mineral - $2,
             gas     = gas     - $3,
             energy  = energy  - $4,
             science = science - $5
       WHERE player_id = $1
         AND mineral >= $2
         AND gas     >= $3
         AND energy  >= $4
         AND science >= $5
      RETURNING id, player_id, mineral, gas, energy, population, science,
                mineral_cap, gas_cap, energy_cap, population_cap, science_cap,
                mineral_per_tick, gas_per_tick, energy_per_tick, population_per_tick,
                science_per_tick, last_tick_at
      `,
      [playerId, mineralCost, gasCost, energyCost, scienceCost],
    )) as Array<{
      id: string;
      player_id: string;
      mineral: string | number;
      gas: string | number;
      energy: string | number;
      population: string | number;
      science: string | number;
      mineral_cap: string | number;
      gas_cap: string | number;
      energy_cap: string | number;
      population_cap: string | number;
      science_cap: string | number;
      mineral_per_tick: string | number;
      gas_per_tick: string | number;
      energy_per_tick: string | number;
      population_per_tick: string | number;
      science_per_tick: string | number;
      last_tick_at: Date | null;
    }>;

    if (rows.length === 0) {
      // The balance was sufficient at canAfford() time but was drained
      // by a concurrent debit (or never met the threshold once numeric
      // rounding settled). Surface as a 400 so the frontend retries
      // gracefully instead of bubbling a 500.
      throw new BadRequestException('Yetersiz kaynak');
    }

    const r = rows[0];
    const snapshot: ResourceSnapshot = {
      mineral:           Math.floor(Number(r.mineral)),
      gas:               Math.floor(Number(r.gas)),
      energy:            Math.floor(Number(r.energy)),
      population:        Math.floor(Number(r.population)),
      science:           Math.floor(Number(r.science ?? 0)),
      mineralCap:        Number(r.mineral_cap),
      gasCap:            Number(r.gas_cap),
      energyCap:         Number(r.energy_cap),
      populationCap:     Number(r.population_cap),
      scienceCap:        Number(r.science_cap ?? 999999),
      mineralPerTick:    Number(r.mineral_per_tick),
      gasPerTick:        Number(r.gas_per_tick),
      energyPerTick:     Number(r.energy_per_tick),
      populationPerTick: Number(r.population_per_tick),
      sciencePerTick:    Number(r.science_per_tick ?? 0),
      lastTickAt:        r.last_tick_at,
    };

    await this.setCache(playerId, snapshot);

    this.logger.debug(
      `Deducted resources for player ${playerId}: -${mineralCost}M -${gasCost}G -${energyCost}E -${scienceCost}◈`,
    );
    return snapshot;
  }

  async updateRates(
    playerId: string,
    rates: {
      mineralPerTick: number;
      gasPerTick: number;
      energyPerTick: number;
      populationPerTick?: number;
      /** Cycle 17 BAL-02 — research-lab science trickle. Optional so
       *  older callers (and tests) that don't pass it leave the column
       *  untouched. */
      sciencePerTick?: number;
    },
  ): Promise<void> {
    const resource = await this.getOrCreate(playerId);
    resource.mineralPerTick = rates.mineralPerTick;
    resource.gasPerTick = rates.gasPerTick;
    resource.energyPerTick = rates.energyPerTick;
    if (rates.populationPerTick !== undefined) {
      resource.populationPerTick = rates.populationPerTick;
    }
    if (rates.sciencePerTick !== undefined) {
      resource.sciencePerTick = rates.sciencePerTick;
    }
    await this.resourceRepo.save(resource);
    await this.invalidateCache(playerId);
    this.logger.debug(
      `Updated production rates for ${playerId}: +${rates.mineralPerTick}M/tick ` +
        `+${rates.gasPerTick}G/tick +${rates.energyPerTick}E/tick ` +
        `+${rates.sciencePerTick ?? 0}◈/tick`,
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
    // Cycle 17 BAL-02: science trickle accrues alongside the other
    // currencies in the single-player tick path too. Cap falls back to a
    // safe ceiling if the column is somehow null (defensive — the schema
    // defaults it to 10T).
    resource.science = Math.min(
      Math.floor(Number(resource.science ?? 0) + Number(resource.sciencePerTick ?? 0)),
      Number(resource.scienceCap ?? Number.MAX_SAFE_INTEGER),
    );
    resource.lastTickAt = new Date();

    await this.resourceRepo.save(resource);
    const snapshot = this.toSnapshot(resource);
    await this.setCache(playerId, snapshot);

    this.checkStorageWarning(playerId, snapshot);

    return snapshot;
  }

  /**
   * Bulk version of applyTick — advances every actively-producing row in a
   * single SQL round-trip instead of N (= active player count) round-trips
   * from the cron worker. Replaces the per-player for-of loop in
   * ResourceTickWorker, cutting ~2 queries per active producer per tick.
   *
   * Postgres handles the cap clamp inline via LEAST(...) so we never
   * over-credit a wallet, and RETURNING gives us the post-update values
   * for the Redis cache priming + storage-warning fan-out below.
   *
   * Population is intentionally NOT in the WHERE filter. The three
   * "currency" rates plus science (cycle 17 BAL-02 lab trickle) gate
   * activeness — a science-only producer (e.g. an academy with no mineral/
   * gas/energy output) must still tick so its research trickle accrues.
   * Population_per_tick > 0 alone still wouldn't trigger a tick row.
   */
  async applyTickBulk(): Promise<number> {
    // Cycle 17 BAL-02: science accrues from the lab trickle the same way
    // mineral/gas/energy do — capped at science_cap via LEAST(...). The
    // WHERE filter now also lets a science-only producer (e.g. an academy
    // with no currency output) tick so the trickle actually accumulates.
    const rows = await this.dataSource.query(`
      UPDATE player_resources
      SET mineral    = LEAST(mineral_cap,    FLOOR(mineral    + mineral_per_tick)),
          gas        = LEAST(gas_cap,        FLOOR(gas        + gas_per_tick)),
          energy     = LEAST(energy_cap,     FLOOR(energy     + energy_per_tick)),
          population = LEAST(population_cap, FLOOR(population + population_per_tick)),
          science    = LEAST(science_cap,    FLOOR(science    + science_per_tick)),
          last_tick_at = NOW()
      WHERE mineral_per_tick > 0
         OR gas_per_tick > 0
         OR energy_per_tick > 0
         OR science_per_tick > 0
      RETURNING player_id, mineral, gas, energy, population, science,
                mineral_cap, gas_cap, energy_cap, population_cap, science_cap,
                mineral_per_tick, gas_per_tick, energy_per_tick, population_per_tick,
                science_per_tick, last_tick_at
    `) as Array<{
      player_id: string;
      mineral: string | number;
      gas: string | number;
      energy: string | number;
      population: string | number;
      science: string | number;
      mineral_cap: string | number;
      gas_cap: string | number;
      energy_cap: string | number;
      population_cap: string | number;
      science_cap: string | number;
      mineral_per_tick: string | number;
      gas_per_tick: string | number;
      energy_per_tick: string | number;
      population_per_tick: string | number;
      science_per_tick: string | number;
      last_tick_at: Date;
    }>;

    if (rows.length === 0) return 0;

    // ── Prime the Redis cache + emit warnings — pipelined to keep this O(1) round-trips ──
    const pipeline = this.redis.pipeline();
    const warnings: Array<{ playerId: string; nearFull: string[]; snapshot: ResourceSnapshot }> = [];

    for (const r of rows) {
      const snapshot: ResourceSnapshot = {
        mineral:           Math.floor(Number(r.mineral)),
        gas:               Math.floor(Number(r.gas)),
        energy:            Math.floor(Number(r.energy)),
        population:        Math.floor(Number(r.population)),
        science:           Math.floor(Number(r.science ?? 0)),
        mineralCap:        Number(r.mineral_cap),
        gasCap:            Number(r.gas_cap),
        energyCap:         Number(r.energy_cap),
        populationCap:     Number(r.population_cap),
        scienceCap:        Number(r.science_cap ?? 999999),
        mineralPerTick:    Number(r.mineral_per_tick),
        gasPerTick:        Number(r.gas_per_tick),
        energyPerTick:     Number(r.energy_per_tick),
        populationPerTick: Number(r.population_per_tick),
        sciencePerTick:    Number(r.science_per_tick ?? 0),
        lastTickAt:        r.last_tick_at,
      };

      pipeline.set(
        RESOURCE_CACHE_KEY(r.player_id),
        JSON.stringify(snapshot),
        'EX',
        RESOURCE_CACHE_TTL,
      );

      const nearFull: string[] = [];
      if (snapshot.mineralCap > 0 && snapshot.mineral / snapshot.mineralCap >= STORAGE_WARN_THRESHOLD) nearFull.push('mineral');
      if (snapshot.gasCap     > 0 && snapshot.gas     / snapshot.gasCap     >= STORAGE_WARN_THRESHOLD) nearFull.push('gas');
      if (snapshot.energyCap  > 0 && snapshot.energy  / snapshot.energyCap  >= STORAGE_WARN_THRESHOLD) nearFull.push('energy');

      if (nearFull.length > 0) {
        warnings.push({ playerId: r.player_id, nearFull, snapshot });
      }
    }

    await pipeline.exec();

    // Fan out storage warnings after the pipeline so the cache is hot
    // before any listener (e.g. socket gateway) reads back the snapshot.
    if (warnings.length > 0) {
      this.emitter.emit('resources.storage_near_full_bulk', warnings);
      for (const w of warnings) {
        this.emitter.emit('resources.storage_near_full', w);
      }
    }

    return rows.length;
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
      science:          Math.floor(Number(resource.science ?? 0)),
      mineralCap:       resource.mineralCap,
      gasCap:           resource.gasCap,
      energyCap:        resource.energyCap,
      populationCap:    resource.populationCap,
      scienceCap:       resource.scienceCap ?? 999999,
      mineralPerTick:   Number(resource.mineralPerTick),
      gasPerTick:       Number(resource.gasPerTick),
      energyPerTick:    Number(resource.energyPerTick),
      populationPerTick:Number(resource.populationPerTick),
      sciencePerTick:   Number(resource.sciencePerTick ?? 0),
      lastTickAt:       resource.lastTickAt,
    };
  }

  private async setCache(playerId: string, snapshot: ResourceSnapshot): Promise<void> {
    await this.redis.set(RESOURCE_CACHE_KEY(playerId), JSON.stringify(snapshot), 'EX', RESOURCE_CACHE_TTL);
  }
}
