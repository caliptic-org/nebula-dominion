import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThanOrEqual, Repository } from 'typeorm';
import { PlayerUnit } from './entities/player-unit.entity';
import { TrainingQueue } from './entities/training-queue.entity';
import {
  UnitType,
  UNIT_CONFIGS,
  getUnitConfigsByRace,
  applyRaceBonuses,
} from './constants/race-configs.constants';
import { Race } from '../matchmaking/dto/join-queue.dto';
import { BuildingType, BuildingStatus } from '../buildings/entities/building.entity';
import { Building } from '../buildings/entities/building.entity';
import { ResourcesService } from '../resources/resources.service';
import { TrainUnitDto } from './dto/train-unit.dto';
import { MoveUnitDto } from './dto/move-unit.dto';

/** Buildings that are valid production buildings for unit training */
const PRODUCTION_BUILDINGS = new Set<BuildingType>([
  BuildingType.BARRACKS,
  BuildingType.FACTORY,
  BuildingType.SPAWNING_POOL,
  BuildingType.HATCHERY,
  BuildingType.ACADEMY,
]);

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);

  constructor(
    @InjectRepository(PlayerUnit)
    private readonly unitRepo: Repository<PlayerUnit>,
    @InjectRepository(TrainingQueue)
    private readonly queueRepo: Repository<TrainingQueue>,
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    private readonly resources: ResourcesService,
  ) {}

  /**
   * Queue a unit for training.
   * Validates the building type, checks affordability, deducts resources and
   * inserts a TrainingQueue entry.
   */
  async trainUnit(playerId: string, dto: TrainUnitDto): Promise<TrainingQueue> {
    const config = UNIT_CONFIGS[dto.unitType];
    if (!config) {
      throw new BadRequestException(`Unknown unit type: ${dto.unitType}`);
    }

    // Validate building exists and belongs to this player
    const building = await this.buildingRepo.findOne({
      where: { id: dto.buildingId, playerId, status: BuildingStatus.ACTIVE },
    });
    if (!building) {
      throw new NotFoundException(
        `Building ${dto.buildingId} not found or not active for player ${playerId}.`,
      );
    }

    // Validate building type is a production building
    if (!PRODUCTION_BUILDINGS.has(building.type)) {
      throw new BadRequestException(
        `Building type ${building.type} cannot train units.`,
      );
    }

    // Validate building type matches unit's required building
    if (building.type !== config.requiredBuilding) {
      throw new BadRequestException(
        `Unit ${dto.unitType} requires a ${config.requiredBuilding}, but building is ${building.type}.`,
      );
    }

    // Check resources
    const canAfford = await this.resources.canAfford(playerId, config.cost);
    if (!canAfford) {
      throw new BadRequestException(
        `Insufficient resources. Required: ${config.cost.mineral}M ${config.cost.gas}G ${config.cost.energy}E`,
      );
    }

    await this.resources.deduct(playerId, config.cost);

    const now = new Date();
    const completesAt = new Date(now.getTime() + config.trainTimeSeconds * 1000);

    const entry = this.queueRepo.create({
      playerId,
      buildingId: dto.buildingId,
      unitType: dto.unitType,
      race: config.race,
      completesAt,
      isComplete: false,
    });

    await this.queueRepo.save(entry);
    this.logger.log(
      `Player ${playerId} queued training of ${dto.unitType} in building ${dto.buildingId}. Completes at: ${completesAt.toISOString()}`,
    );

    return entry;
  }

  /** List pending (non-completed) training queue entries for a player */
  async getTrainingQueue(playerId: string): Promise<TrainingQueue[]> {
    return this.queueRepo.find({
      where: { playerId, isComplete: false },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Complete overdue training entries.
   * If playerId is provided, only completes for that player.
   * Called by the background worker on each resource tick.
   */
  async completeTraining(playerId?: string): Promise<number> {
    const now = new Date();

    const where: FindOptionsWhere<TrainingQueue> = {
      isComplete: false,
      completesAt: LessThanOrEqual(now),
    };
    if (playerId) {
      where.playerId = playerId;
    }

    const overdue = await this.queueRepo.find({ where });
    if (overdue.length === 0) return 0;

    for (const entry of overdue) {
      const config = UNIT_CONFIGS[entry.unitType];
      if (!config) continue;

      const unit = this.unitRepo.create({
        playerId: entry.playerId,
        type: entry.unitType,
        race: entry.race,
        hp: config.hp,
        maxHp: config.hp,
        attack: config.attack,
        defense: config.defense,
        speed: config.speed,
        positionX: 0,
        positionY: 0,
        abilities: config.abilities,
        isAlive: true,
      });

      await this.unitRepo.save(unit);

      entry.isComplete = true;
      await this.queueRepo.save(entry);

      this.logger.log(
        `Training complete: ${entry.unitType} for player ${entry.playerId} (unit id: ${unit.id})`,
      );
    }

    return overdue.length;
  }

  /** List alive units for a player */
  async getUnits(playerId: string): Promise<PlayerUnit[]> {
    return this.unitRepo.find({
      where: { playerId, isAlive: true },
      order: { createdAt: 'ASC' },
    });
  }

  /** Upgrade a unit one level. Validates ownership + caps level at 10.
   *  Bumps level + applies +10% to hp/maxHp/attack/defense; speed stays
   *  fixed so high-tier units don't outrun the grid. Persisted directly
   *  on the row so combat math doesn't have to re-derive scaling.
   *
   *  No resource cost yet — when an "upgrade fee" mechanic lands, hook
   *  it through ResourcesService.canAfford/deduct the same way
   *  startConstruction does. For now this is the "free upgrade" demo
   *  flow so the /inventory + /base/building YÜKSELT buttons actually
   *  do something. */
  async upgradeUnit(playerId: string, unitId: string): Promise<PlayerUnit> {
    const unit = await this.unitRepo.findOne({
      where: { id: unitId, playerId, isAlive: true },
    });
    if (!unit) {
      throw new NotFoundException(`Unit ${unitId} not found or not alive.`);
    }
    if (unit.level >= 10) {
      throw new BadRequestException(`Unit is already at max level (10).`);
    }
    unit.level += 1;
    const mul = 1.1;
    unit.maxHp = Math.round(unit.maxHp * mul);
    unit.hp = Math.min(unit.hp + Math.round(unit.maxHp * 0.2), unit.maxHp);
    unit.attack = Math.round(unit.attack * mul);
    unit.defense = Math.round(unit.defense * mul);
    return this.unitRepo.save(unit);
  }

  /**
   * Move a unit on the map.
   * Max Manhattan distance per move = unit's speed.
   */
  async moveUnit(playerId: string, dto: MoveUnitDto): Promise<PlayerUnit> {
    const unit = await this.unitRepo.findOne({
      where: { id: dto.unitId, playerId, isAlive: true },
    });
    if (!unit) {
      throw new NotFoundException(
        `Unit ${dto.unitId} not found or not alive for player ${playerId}.`,
      );
    }

    const distance = Math.abs(dto.toX - unit.positionX) + Math.abs(dto.toY - unit.positionY);
    if (distance > unit.speed) {
      throw new BadRequestException(
        `Unit can only move ${unit.speed} tiles per turn (requested ${distance}).`,
      );
    }

    unit.positionX = dto.toX;
    unit.positionY = dto.toY;
    await this.unitRepo.save(unit);

    this.logger.debug(
      `Player ${playerId} moved unit ${unit.id} (${unit.type}) to (${dto.toX}, ${dto.toY}).`,
    );
    return unit;
  }

  /**
   * Returns available unit configs for a race with race bonuses applied.
   */
  getRaceUnitConfigs(race: Race) {
    const configs = getUnitConfigsByRace(race);
    return configs.map(applyRaceBonuses);
  }
}
