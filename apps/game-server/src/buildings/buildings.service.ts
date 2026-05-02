import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Building, BuildingStatus, BuildingType } from './entities/building.entity';
import { BUILDING_CONFIGS } from './buildings.constants';
import { ResourcesService } from '../resources/resources.service';
import { StartConstructionDto } from './dto/start-construction.dto';

@Injectable()
export class BuildingsService {
  private readonly logger = new Logger(BuildingsService.name);

  constructor(
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    private readonly resources: ResourcesService,
  ) {}

  async startConstruction(playerId: string, dto: StartConstructionDto): Promise<Building> {
    const config = BUILDING_CONFIGS[dto.type];

    const existing = await this.buildingRepo.count({
      where: { playerId, type: dto.type, status: BuildingStatus.ACTIVE },
    });
    if (existing >= config.maxPerPlayer) {
      throw new BadRequestException(
        `Maximum ${config.maxPerPlayer} ${dto.type} buildings allowed per player.`,
      );
    }

    const occupied = await this.buildingRepo.findOne({
      where: { playerId, positionX: dto.positionX, positionY: dto.positionY },
    });
    if (occupied) {
      throw new BadRequestException(`Position (${dto.positionX}, ${dto.positionY}) is already occupied.`);
    }

    const canAfford = await this.resources.canAfford(playerId, config.cost);
    if (!canAfford) {
      throw new BadRequestException(
        `Insufficient resources. Required: ${config.cost.mineral}M ${config.cost.gas}G ${config.cost.energy}E`,
      );
    }

    await this.resources.deduct(playerId, config.cost);

    const now = new Date();
    const completeAt = new Date(now.getTime() + config.buildTimeSeconds * 1000);

    const building = this.buildingRepo.create({
      playerId,
      type: dto.type,
      status: config.buildTimeSeconds === 0 ? BuildingStatus.ACTIVE : BuildingStatus.CONSTRUCTING,
      positionX: dto.positionX,
      positionY: dto.positionY,
      constructionStartedAt: now,
      constructionCompleteAt: config.buildTimeSeconds === 0 ? null : completeAt,
    });

    await this.buildingRepo.save(building);

    this.logger.log(
      `Player ${playerId} started construction of ${dto.type} at (${dto.positionX},${dto.positionY}). Complete at: ${completeAt.toISOString()}`,
    );

    if (building.status === BuildingStatus.ACTIVE) {
      await this.recalculateProductionRates(playerId);
    }

    return building;
  }

  async getBuildings(playerId: string): Promise<Building[]> {
    return this.buildingRepo.find({ where: { playerId } });
  }

  async getActiveBuildings(playerId: string): Promise<Building[]> {
    return this.buildingRepo.find({ where: { playerId, status: BuildingStatus.ACTIVE } });
  }

  async destroyBuilding(playerId: string, buildingId: string): Promise<void> {
    const building = await this.buildingRepo.findOne({ where: { id: buildingId, playerId } });
    if (!building) {
      throw new NotFoundException(`Building ${buildingId} not found for player ${playerId}.`);
    }
    if (building.status === BuildingStatus.DESTROYED) {
      throw new BadRequestException(`Building ${buildingId} is already destroyed.`);
    }
    if (building.type === BuildingType.COMMAND_CENTER) {
      throw new BadRequestException(`Cannot destroy Command Center.`);
    }

    building.status = BuildingStatus.DESTROYED;
    await this.buildingRepo.save(building);
    await this.recalculateProductionRates(playerId);

    this.logger.log(`Player ${playerId} destroyed building ${buildingId} (${building.type}).`);
  }

  /** Called by ResourceTickWorker to complete any overdue constructions */
  async completeOverdueConstructions(): Promise<number> {
    const now = new Date();
    const overdue = await this.buildingRepo.find({
      where: {
        status: BuildingStatus.CONSTRUCTING,
        constructionCompleteAt: LessThanOrEqual(now),
      },
    });

    if (overdue.length === 0) return 0;

    const affectedPlayers = new Set<string>();
    for (const building of overdue) {
      building.status = BuildingStatus.ACTIVE;
      affectedPlayers.add(building.playerId);
    }

    await this.buildingRepo.save(overdue);
    this.logger.log(`Completed ${overdue.length} constructions.`);

    for (const pid of affectedPlayers) {
      await this.recalculateProductionRates(pid);
    }

    return overdue.length;
  }

  async recalculateProductionRates(playerId: string): Promise<void> {
    const activeBuildings = await this.getActiveBuildings(playerId);

    let mineralPerTick = 0;
    let gasPerTick = 0;
    let energyPerTick = 0;

    for (const building of activeBuildings) {
      const cfg = BUILDING_CONFIGS[building.type];
      mineralPerTick += cfg.production.mineralPerTick;
      gasPerTick += cfg.production.gasPerTick;
      energyPerTick += cfg.production.energyPerTick - cfg.energyConsumptionPerTick;
    }

    await this.resources.updateRates(playerId, { mineralPerTick, gasPerTick, energyPerTick });
  }
}
