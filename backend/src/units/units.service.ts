import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UnitType, Race } from './entities/unit-type.entity';
import { Unit, UnitStatus } from './entities/unit.entity';
import { ProductionQueueService, ProductionJob } from './production-queue.service';
import { AGE_1_UNIT_TYPES } from './seed/unit-types.seed';
import { TrainUnitDto } from './dto/train-unit.dto';

@Injectable()
export class UnitsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UnitsService.name);

  constructor(
    @InjectRepository(UnitType)
    private readonly unitTypeRepo: Repository<UnitType>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    private readonly queue: ProductionQueueService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedUnitTypes();
  }

  private async seedUnitTypes(): Promise<void> {
    const count = await this.unitTypeRepo.count();
    if (count > 0) return;

    this.logger.log('Seeding Age 1 unit types for Human and Zerg races…');
    const entities = AGE_1_UNIT_TYPES.map((d) => this.unitTypeRepo.create(d));
    await this.unitTypeRepo.save(entities);
    this.logger.log(`Seeded ${entities.length} unit types.`);
  }

  // ── Unit Types ──────────────────────────────────────────────────────────────

  async getAllUnitTypes(): Promise<UnitType[]> {
    return this.unitTypeRepo.find({ where: { isActive: true }, order: { globalTier: 'ASC' } });
  }

  async getUnitTypesByRace(race: Race): Promise<UnitType[]> {
    return this.unitTypeRepo.find({
      where: { race, isActive: true },
      order: { ageNumber: 'ASC', tierLevel: 'ASC' },
    });
  }

  async getUnitTypesByAge(ageNumber: number): Promise<UnitType[]> {
    return this.unitTypeRepo.find({
      where: { ageNumber, isActive: true },
      order: { race: 'ASC', tierLevel: 'ASC' },
    });
  }

  async getUnitTypeByCode(code: string): Promise<UnitType> {
    const ut = await this.unitTypeRepo.findOne({ where: { code } });
    if (!ut) throw new NotFoundException(`Unit type '${code}' not found`);
    return ut;
  }

  // ── Training / Production Queue ──────────────────────────────────────────────

  async trainUnit(dto: TrainUnitDto): Promise<{ jobId: string; completesAt: Date; trainingTimeSeconds: number }> {
    const unitType = await this.getUnitTypeByCode(dto.unitTypeCode);

    const now = Date.now();
    const completesAt = now + unitType.trainingTimeSeconds * 1000;
    const jobId = uuidv4();

    const job: ProductionJob = {
      jobId,
      playerId: dto.playerId,
      unitTypeId: unitType.id,
      unitTypeCode: unitType.code,
      queuedAt: now,
      completesAt,
    };

    await this.queue.enqueue(job);

    this.logger.log(
      `Player ${dto.playerId} started training ${unitType.code} (job: ${jobId}), completes in ${unitType.trainingTimeSeconds}s`,
    );

    return { jobId, completesAt: new Date(completesAt), trainingTimeSeconds: unitType.trainingTimeSeconds };
  }

  async collectCompletedUnits(playerId: string): Promise<Unit[]> {
    const completedJobs = await this.queue.getCompletedJobs(playerId);
    if (!completedJobs.length) return [];

    const newUnits: Unit[] = [];

    for (const job of completedJobs) {
      const unitType = await this.unitTypeRepo.findOne({ where: { id: job.unitTypeId } });
      if (!unitType) {
        await this.queue.removeJob(playerId, job.jobId);
        continue;
      }

      const unit = this.unitRepo.create({
        playerId,
        unitTypeId: unitType.id,
        currentHp: unitType.baseHp,
        maxHp: unitType.baseHp,
        attack: unitType.baseAttack,
        defense: unitType.baseDefense,
        speed: unitType.baseSpeed,
        status: UnitStatus.ALIVE,
        experience: 0,
        kills: 0,
        mutationCount: 0,
      });

      const saved = await this.unitRepo.save(unit);
      newUnits.push(saved);
      await this.queue.removeJob(playerId, job.jobId);

      this.logger.log(`Player ${playerId} received unit ${unitType.code} (id: ${saved.id})`);
    }

    return newUnits;
  }

  async cancelTraining(playerId: string, jobId: string): Promise<boolean> {
    return this.queue.cancelJob(playerId, jobId);
  }

  async getProductionQueue(playerId: string): Promise<Array<{ job: ProductionJob; remainingSeconds: number }>> {
    return this.queue.getQueuedJobs(playerId);
  }

  async getQueueLength(playerId: string): Promise<{ length: number }> {
    const length = await this.queue.getQueueLength(playerId);
    return { length };
  }

  // ── Player Units ─────────────────────────────────────────────────────────────

  async getPlayerUnits(
    playerId: string,
    filters?: { race?: Race; ageNumber?: number; status?: UnitStatus },
  ): Promise<Unit[]> {
    const qb = this.unitRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.unitType', 'ut')
      .where('u.player_id = :playerId', { playerId });

    if (filters?.status) {
      qb.andWhere('u.status = :status', { status: filters.status });
    }
    if (filters?.race) {
      qb.andWhere('ut.race = :race', { race: filters.race });
    }
    if (filters?.ageNumber !== undefined) {
      qb.andWhere('ut.age_number = :ageNumber', { ageNumber: filters.ageNumber });
    }

    return qb.orderBy('u.created_at', 'DESC').getMany();
  }

  async getUnit(unitId: string): Promise<Unit> {
    const unit = await this.unitRepo.findOne({ where: { id: unitId }, relations: ['unitType'] });
    if (!unit) throw new NotFoundException(`Unit ${unitId} not found`);
    return unit;
  }

  async healUnit(unitId: string, amount: number): Promise<Unit> {
    const unit = await this.getUnit(unitId);
    unit.currentHp = Math.min(unit.currentHp + amount, unit.maxHp);
    return this.unitRepo.save(unit);
  }

  async deleteUnit(playerId: string, unitId: string): Promise<void> {
    const unit = await this.unitRepo.findOne({ where: { id: unitId, playerId } });
    if (!unit) throw new NotFoundException(`Unit ${unitId} not found for player ${playerId}`);
    await this.unitRepo.remove(unit);
  }

  async getPlayerUnitStats(playerId: string): Promise<{
    total: number;
    alive: number;
    dead: number;
    inBattle: number;
    byRace: Record<string, number>;
  }> {
    const units = await this.getPlayerUnits(playerId);
    const stats = {
      total: units.length,
      alive: 0,
      dead: 0,
      inBattle: 0,
      byRace: {} as Record<string, number>,
    };

    for (const unit of units) {
      if (unit.status === UnitStatus.ALIVE) stats.alive++;
      else if (unit.status === UnitStatus.DEAD) stats.dead++;
      else if (unit.status === UnitStatus.IN_BATTLE) stats.inBattle++;

      const race = unit.unitType?.race ?? 'unknown';
      stats.byRace[race] = (stats.byRace[race] ?? 0) + 1;
    }

    return stats;
  }
}
