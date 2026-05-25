import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
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
  ) {}

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

  async queueUnit(
    baseId: string,
    playerId: string,
    dto: QueueUnitDto,
  ): Promise<ProductionQueueItemDto> {
    await this.assertBaseOwnership(baseId, playerId);

    const existing = await this.queueRepo.find({
      where: { baseId, isComplete: false },
      order: { position: 'ASC' },
    });
    if (existing.length >= MAX_QUEUE_SIZE) {
      throw new ConflictException(
        `Base ${baseId} production queue is full (${MAX_QUEUE_SIZE} items max)`,
      );
    }

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
        `position ${saved.position}, completes ${completesAt.toISOString()}`,
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
