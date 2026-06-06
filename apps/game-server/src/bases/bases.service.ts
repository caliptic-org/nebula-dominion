import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Building, BuildingType } from '../buildings/entities/building.entity';
import { UNIT_CONFIGS, UnitType } from '../units/constants/race-configs.constants';
import { PlayerUnit } from '../units/entities/player-unit.entity';
import { BaseProductionQueueEntry } from './entities/base-production-queue.entity';
import { QueueUnitDto } from './dto/queue-unit.dto';
import {
  computeTotalDurationSeconds,
  getUnitMeta,
  isKnownUnitType,
} from './unit-meta';
import { ResourcesService } from '../resources/resources.service';
import { CommandersService } from '../commanders/commanders.service';
import { Race } from '../matchmaking/dto/join-queue.dto';

export interface ProductionQueueItemDto {
  id: string;
  unitType: string;
  unitEmoji: string;
  unitName: string;
  level: number;
  position: number;
  totalDurationSeconds: number;
  remainingSeconds: number;
  startedAt: string;
}

export interface ProductionQueueResponse {
  queue: ProductionQueueItemDto[];
}

const MAX_QUEUE_SIZE = 5;

@Injectable()
export class BasesService {
  private readonly logger = new Logger(BasesService.name);
  private tickRunning = false;

  constructor(
    @InjectRepository(BaseProductionQueueEntry)
    private readonly queueRepo: Repository<BaseProductionQueueEntry>,
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    @InjectRepository(PlayerUnit)
    private readonly unitRepo: Repository<PlayerUnit>,
    private readonly resources: ResourcesService,
    private readonly commanders: CommandersService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Look up the player's race from the api-owned `users.race` column.
   * Game-server doesn't own a User entity; we hit the shared DB directly
   * (same pattern progression/gates.service.ts uses to read `u.race`).
   * Returns null if the user row is missing or race hasn't been set yet,
   * in which case queueUnit() will reject the race-check defensively.
   */
  private async getPlayerRace(playerId: string): Promise<Race | null> {
    const rows = await this.dataSource.query<{ race: string | null }[]>(
      `SELECT race FROM users WHERE id = $1 LIMIT 1`,
      [playerId],
    );
    const raw = rows[0]?.race;
    if (!raw) return null;
    // users.race is api's Race enum (english snake_case). Both apis agree
    // on the string literals (human/zerg/automaton/beast/demon), so a
    // direct cast through the game-server Race enum is safe.
    const allowed = Object.values(Race) as string[];
    return allowed.includes(raw) ? (raw as Race) : null;
  }

  /**
   * Looks up the base (= COMMAND_CENTER building) and asserts the caller owns it.
   * Throws 404 if no such base exists, 403 if it exists but belongs to another player.
   */
  async assertBaseOwnership(baseId: string, playerId: string): Promise<Building> {
    const owned = await this.buildingRepo.findOne({
      where: { id: baseId, playerId, type: BuildingType.COMMAND_CENTER },
    });
    if (owned) return owned;

    const other = await this.buildingRepo.findOne({
      where: { id: baseId, type: BuildingType.COMMAND_CENTER },
    });
    if (other) {
      throw new ForbiddenException(
        `Base ${baseId} does not belong to player ${playerId}`,
      );
    }
    throw new NotFoundException(`Base ${baseId} not found`);
  }

  async getQueue(baseId: string, playerId: string): Promise<ProductionQueueResponse> {
    await this.assertBaseOwnership(baseId, playerId);
    const entries = await this.queueRepo.find({
      where: { baseId, isComplete: false },
      order: { position: 'ASC' },
    });
    const now = Date.now();
    return {
      queue: entries.map((e) => this.toDto(e, now)),
    };
  }

  /**
   * Queue a unit at a base's production line. Mirrors the cost+commander
   * pipeline in UnitsService.trainUnit() — the previous implementation
   * (ECON-CYC6-01) skipped both the race check and the wallet deduct
   * entirely, so processCompleted() would happily mint a Human Marine L20
   * for a Zerg account at zero cost. The exploit fired in two steps:
   *
   *   1. POST /api/bases/:id/production-queue {unitType:"marine",level:20}
   *      — DTO only validated snake_case + level∈[1..20]; the controller
   *        and service never consulted UNIT_CONFIGS[marine].race or the
   *        player's own race, and never debited any resources.
   *   2. processCompleted() (cron, every 5s) found the overdue row, mapped
   *      it through UNIT_CONFIGS[marine] (Human race, base stats) and
   *      inserted a PlayerUnit at the client-supplied level. Free mint of
   *      an out-of-race max-tier unit.
   *
   * New contract:
   *   - Reject with ForbiddenException if the unitType's race in
   *     UNIT_CONFIGS doesn't match the player's `users.race`.
   *   - Reject with BadRequestException if UNIT_CONFIGS marks the unit
   *     `trainable: false` (merge-only result types like sniper / mecha
   *     walker / captain — same gate UnitsService.trainUnit() enforces).
   *   - Compute scaled cost = round(base × 1.5^(level-1)) per resource,
   *     same curve as UnitsService.upgradeUnit() per-level scaling.
   *   - Apply commander trainCostMultiplier (clamped at 5% min) so an
   *     active Azurath / Reyes discount carries over from /units/train.
   *   - canAfford → deduct BEFORE saving the queue row. If the save
   *     subsequently throws, the wallet stays debited (acceptable: same
   *     trade-off as trainUnit() — players don't lose resources to
   *     queue-row INSERT failures in practice).
   *   - Unknown unitType (not in UNIT_CONFIGS) is rejected outright. The
   *     pre-fix code accepted any snake_case string and silently dropped
   *     the mint at processCompleted() time, which is a worse UX (silent
   *     swallow) than a 400 here. Tests that exercised the "shadow_lord"
   *     unknown-type path are updated accordingly.
   */
  async queueUnit(
    baseId: string,
    playerId: string,
    dto: QueueUnitDto,
  ): Promise<ProductionQueueItemDto> {
    await this.assertBaseOwnership(baseId, playerId);

    // ── Unit catalog gate ────────────────────────────────────────────
    // Unknown / off-catalog unitType is rejected: minting only happens
    // for entries with UNIT_CONFIGS[entry.unitType], so allowing
    // arbitrary types in the queue would just produce silent no-ops
    // (queue countdown burns, no PlayerUnit appears). A clean 400 keeps
    // expectations honest.
    if (!isKnownUnitType(dto.unitType)) {
      throw new BadRequestException(
        `Bilinmeyen birim tipi: ${dto.unitType}`,
      );
    }
    const config = UNIT_CONFIGS[dto.unitType as UnitType];

    // ── Merge-only guard ─────────────────────────────────────────────
    // Mirrors UnitsService.trainUnit(): T2-T5 merge-result units carry
    // trainable=false so a direct queue order can't bypass the
    // Promosyon Töreni recipe.
    if (config.trainable === false) {
      throw new BadRequestException(
        `${dto.unitType} eğitilemez — sadece birleştirme ile elde edilir (Promosyon Töreni).`,
      );
    }

    // ── Race-match gate ──────────────────────────────────────────────
    // Pre-fix a Zerg account could queue unitType=marine and get a free
    // Human marine because the only thing the path consulted was the
    // unit's own config (which carries its native race). Look up the
    // player's race from users.race (api-owned column) and refuse a
    // cross-race order.
    const playerRace = await this.getPlayerRace(playerId);
    if (!playerRace) {
      throw new ForbiddenException(
        'Irk seçilmemiş — birim üretimi için önce bir ırk seç.',
      );
    }
    if (config.race !== playerRace) {
      throw new ForbiddenException('Bu birim ırkına uygun değil');
    }

    const existing = await this.queueRepo.find({
      where: { baseId, isComplete: false },
      order: { position: 'ASC' },
    });
    if (existing.length >= MAX_QUEUE_SIZE) {
      throw new ConflictException(
        `Base ${baseId} production queue is full (${MAX_QUEUE_SIZE} items max)`,
      );
    }

    // ── Cost computation ─────────────────────────────────────────────
    // 1.5^(level-1) curve: L1 = base, L2 = ×1.5, L5 = ×5.06, L20 = ×2216.
    // Same shape as UnitsService.upgradeUnit() per-level scaling, so
    // queueing a L20 marine costs roughly the same as training a L1
    // marine and upgrading it 19 times — economically equivalent paths.
    const levelScale = Math.pow(1.5, Math.max(0, dto.level - 1));

    // Commander trainCostMultiplier (negative = discount). Read once;
    // clamp at 5% min so a freak stacked discount can't go to zero/below
    // — same clamp as UnitsService.trainUnit().
    const cmdBonus = await this.commanders.getActiveBonus(playerId);
    const safeCostMul = Math.max(0.05, 1 + (cmdBonus.trainCostMultiplier ?? 0));

    const cost = {
      mineral: Math.round((config.cost.mineral ?? 0) * levelScale * safeCostMul),
      gas: Math.round((config.cost.gas ?? 0) * levelScale * safeCostMul),
      energy: Math.round((config.cost.energy ?? 0) * levelScale * safeCostMul),
    };

    // canAfford → deduct in that order; same convention as trainUnit().
    // A 0/0/0 cost (legacy merge-only unit with empty cost record) still
    // passes canAfford trivially.
    const canAfford = await this.resources.canAfford(playerId, cost);
    if (!canAfford) {
      throw new BadRequestException(
        `Yetersiz kaynak. Gerekli: ${cost.mineral}M ${cost.gas}G ${cost.energy}E ` +
          `(${dto.unitType} L${dto.level})`,
      );
    }
    await this.resources.deduct(playerId, cost);

    const totalDurationSeconds = computeTotalDurationSeconds(dto.unitType, dto.level);
    const meta = getUnitMeta(dto.unitType);

    const now = new Date();
    const tail = existing[existing.length - 1];
    const startedAt =
      tail && tail.completesAt.getTime() > now.getTime() ? tail.completesAt : now;
    const completesAt = new Date(
      startedAt.getTime() + totalDurationSeconds * 1000,
    );

    const entry = this.queueRepo.create({
      playerId,
      baseId,
      unitType: dto.unitType,
      unitName: meta.name,
      unitEmoji: meta.emoji,
      level: dto.level,
      position: existing.length + 1,
      totalDurationSeconds,
      startedAt,
      completesAt,
      isComplete: false,
    });

    const saved = await this.queueRepo.save(entry);
    this.logger.log(
      `Player ${playerId} queued ${dto.unitType} L${dto.level} at base ${baseId}, ` +
        `position ${saved.position}, cost ${cost.mineral}M ${cost.gas}G ${cost.energy}E, ` +
        `completes ${completesAt.toISOString()}`,
    );
    return this.toDto(saved, Date.now());
  }

  async cancelUnit(baseId: string, playerId: string, unitId: string): Promise<void> {
    await this.assertBaseOwnership(baseId, playerId);

    const entry = await this.queueRepo.findOne({
      where: { id: unitId, baseId, isComplete: false },
    });
    if (!entry) {
      throw new NotFoundException(
        `Queue entry ${unitId} not found in base ${baseId}`,
      );
    }

    const subsequent = await this.queueRepo.find({
      where: { baseId, isComplete: false, position: MoreThan(entry.position) },
      order: { position: 'ASC' },
    });

    const shiftMs = entry.totalDurationSeconds * 1000;
    await this.queueRepo.remove(entry);

    for (const e of subsequent) {
      e.position -= 1;
      e.startedAt = new Date(e.startedAt.getTime() - shiftMs);
      e.completesAt = new Date(e.completesAt.getTime() - shiftMs);
    }
    if (subsequent.length > 0) {
      await this.queueRepo.save(subsequent);
    }

    this.logger.log(
      `Player ${playerId} cancelled queue entry ${unitId} at base ${baseId} ` +
        `(${entry.unitType} L${entry.level}); shifted ${subsequent.length} subsequent entries`,
    );
  }

  /**
   * Resolves all overdue queue entries: marks them complete and mints the
   * corresponding PlayerUnit row when the unitType maps to a known config.
   * Runs every 5s via @Cron. Re-entrant safe via `tickRunning` flag.
   *
   * NOTE (ECON-CYC6-01): the payment + race + trainable gates live in
   * queueUnit() — by the time a row reaches this worker, the wallet has
   * already been debited and the unitType/race pair has been validated
   * against the player's `users.race`. Pre-existing rows that landed
   * before the gate retrofit will still mint here without a back-debit;
   * acceptable because the audit fix targets new orders only and the
   * historical queue depth is bounded by MAX_QUEUE_SIZE × player count.
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async tickCompletions(): Promise<void> {
    if (this.tickRunning) return;
    this.tickRunning = true;
    try {
      const completed = await this.processCompleted();
      if (completed > 0) {
        this.logger.log(`Completed ${completed} production order(s) this tick.`);
      }
    } catch (err) {
      this.logger.error(
        `Production tick error: ${(err as Error).message}`,
        (err as Error).stack,
      );
    } finally {
      this.tickRunning = false;
    }
  }

  async processCompleted(): Promise<number> {
    const now = new Date();
    const overdue = await this.queueRepo.find({
      where: { isComplete: false, completesAt: LessThanOrEqual(now) },
    });
    if (overdue.length === 0) return 0;

    const affectedBases = new Set<string>();
    for (const entry of overdue) {
      entry.isComplete = true;
      await this.queueRepo.save(entry);
      affectedBases.add(entry.baseId);

      if (isKnownUnitType(entry.unitType)) {
        const config = UNIT_CONFIGS[entry.unitType as UnitType];
        const unit = this.unitRepo.create({
          playerId: entry.playerId,
          type: config.type,
          race: config.race,
          hp: config.hp,
          maxHp: config.hp,
          attack: config.attack,
          defense: config.defense,
          speed: config.speed,
          positionX: 0,
          positionY: 0,
          abilities: config.abilities,
          isAlive: true,
          level: entry.level,
        });
        await this.unitRepo.save(unit);
        this.logger.log(
          `Minted ${config.type} L${entry.level} for player ${entry.playerId} ` +
            `(from queue entry ${entry.id})`,
        );
      } else {
        this.logger.warn(
          `Completed queue entry ${entry.id} but unitType ${entry.unitType} ` +
            `is not in UNIT_CONFIGS — no PlayerUnit row created.`,
        );
      }
    }

    // Compact positions for each affected base so the remaining queue
    // numbers stay 1..N. Other tick state (startedAt/completesAt) is
    // already correct because we set them as absolutes at insert time.
    for (const baseId of affectedBases) {
      const remaining = await this.queueRepo.find({
        where: { baseId, isComplete: false },
        order: { position: 'ASC' },
      });
      const dirty: BaseProductionQueueEntry[] = [];
      for (let i = 0; i < remaining.length; i++) {
        const want = i + 1;
        if (remaining[i].position !== want) {
          remaining[i].position = want;
          dirty.push(remaining[i]);
        }
      }
      if (dirty.length > 0) {
        await this.queueRepo.save(dirty);
      }
    }

    return overdue.length;
  }

  private toDto(e: BaseProductionQueueEntry, nowMs: number): ProductionQueueItemDto {
    return {
      id: e.id,
      unitType: e.unitType,
      unitEmoji: e.unitEmoji,
      unitName: e.unitName,
      level: e.level,
      position: e.position,
      totalDurationSeconds: e.totalDurationSeconds,
      remainingSeconds: Math.max(
        0,
        Math.ceil((e.completesAt.getTime() - nowMs) / 1000),
      ),
      startedAt: e.startedAt.toISOString(),
    };
  }
}
