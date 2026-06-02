import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, LessThanOrEqual, Repository } from 'typeorm';
import { PlayerUnit } from './entities/player-unit.entity';
import { TrainingQueue } from './entities/training-queue.entity';
import {
  UnitType,
  UNIT_CONFIGS,
  MERGE_RECIPES,
  getUnitConfigsByRace,
  applyRaceBonuses,
} from './constants/race-configs.constants';
import { Race } from '../matchmaking/dto/join-queue.dto';
import { BuildingType, BuildingStatus } from '../buildings/entities/building.entity';
import { Building } from '../buildings/entities/building.entity';
import { ResourcesService } from '../resources/resources.service';
import { scaledDurationSec } from '../common/game-speed';
import { ProgressionService } from '../progression/progression.service';
import { XpSource } from '../progression/config/level-config';
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
    private readonly progression: ProgressionService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
    // Defense-in-depth: merge-only units (Sniper/Mecha/Genetic/Captain) have
    // trainable=false in UNIT_CONFIGS. The frontend filters them out via
    // getUnitConfigsByRace, but if anything bypasses that path (a stale
    // bundle, a direct curl, etc.) we'd otherwise let it through to the
    // INSERT and hit "invalid input value for enum training_queue_unit_type_enum"
    // — a 500 with a leaky SQL stack. Clean 400 here keeps the error
    // honest and the DB enum unbothered.
    if (config.trainable === false) {
      throw new BadRequestException(
        `${dto.unitType} eğitilemez — sadece birleştirme ile elde edilir (Promosyon Töreni).`,
      );
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

    // Batch size — defaults to 1, capped at 99 (DTO + DB constraint).
    // Cost and duration scale linearly: a Marine ×5 order debits the
    // wallet 5× and the queue row waits 5× as long before flipping
    // complete (worker then spawns 5 marines from this single row).
    const count = Math.max(1, Math.min(99, dto.count ?? 1));
    const batchCost = {
      mineral: (config.cost.mineral ?? 0) * count,
      gas:     (config.cost.gas ?? 0) * count,
      energy:  (config.cost.energy ?? 0) * count,
      // science isn't part of unit training cost today but multiply
      // defensively so future tier-5+ units that DO need science scale
      // correctly without revisiting this branch.
      science: ((config.cost as { science?: number }).science ?? 0) * count,
    };

    // Check resources
    const canAfford = await this.resources.canAfford(playerId, batchCost);
    if (!canAfford) {
      throw new BadRequestException(
        `Insufficient resources. Required: ${batchCost.mineral}M ${batchCost.gas}G ${batchCost.energy}E (${count}× ${dto.unitType})`,
      );
    }

    await this.resources.deduct(playerId, batchCost);

    const now = new Date();
    // GAME_SPEED_MULTIPLIER honoured here too (see common/game-speed.ts).
    // Pre-scaled duration drives the queue entry; the worker that flips
    // isComplete will see completesAt <= now almost immediately at 1000×.
    // Batch duration = perUnitDuration × count so a "Marine ×5" order
    // doesn't finish before a "Marine ×1" — the player sees the full
    // batch as ONE queue card with a longer countdown rather than 5
    // separate rows finishing at the same instant.
    const completesAt = new Date(
      now.getTime() + scaledDurationSec(config.trainTimeSeconds) * count * 1000,
    );

    const entry = this.queueRepo.create({
      playerId,
      buildingId: dto.buildingId,
      unitType: dto.unitType,
      race: config.race,
      completesAt,
      isComplete: false,
      count,
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

      // Spawn `entry.count` (default 1) units from this single queue row.
      // Each unit is independent in the units table — count only tracks
      // batch-grouping at the queue layer for cost / duration / display.
      const spawnCount = Math.max(1, entry.count ?? 1);
      const spawned: string[] = [];
      for (let i = 0; i < spawnCount; i += 1) {
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
        spawned.push(unit.id);
      }

      entry.isComplete = true;
      await this.queueRepo.save(entry);

      this.logger.log(
        `Training complete: ${entry.unitType} ×${spawnCount} for player ${entry.playerId} (unit ids: ${spawned.join(', ')})`,
      );

      // XP grant — same XpSource.CONSTRUCTION (80 base XP) as buildings.
      // Training a unit is structurally the same kind of action: queue cost
      // up-front, completion via cron tick, payoff a row in the player's
      // inventory. Frontend's ProgressionToaster will surface "+80 XP —
      // İnşa" via the user:<id> socket room. referenceId is the queue
      // entry so awardXp's idempotency dedupes a double-sweep.
      this.progression
        .awardXp({
          userId: entry.playerId,
          source: XpSource.CONSTRUCTION,
          referenceId: `training:${entry.id}`,
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`awardXp(training) skipped for ${entry.playerId}: ${msg}`);
        });
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

  /**
   * Base-level "Promosyon Töreni" merge.  Consumes 3 same-type roster
   * units → spawns 1 next-tier unit per the MERGE_RECIPES table.
   *
   * Validation:
   *   - exactly 3 unitIds, all alive, all owned by caller
   *   - all the same type (no mixing across types — keeps the recipe table
   *     simple; FE already enforces same-tier slot picks but BE is the
   *     authoritative gate)
   *   - source type appears in MERGE_RECIPES (i.e. there IS a next tier)
   *
   * Effect:
   *   - DELETE the 3 source rows
   *   - INSERT 1 new row with result type + result tier's UNIT_CONFIG stats
   *
   * Returns the freshly-spawned PlayerUnit so the FE can route to its
   * detail page or refresh the inventory.
   */
  async mergeRoster(playerId: string, unitIds: string[]): Promise<PlayerUnit> {
    if (unitIds.length !== 3) {
      throw new BadRequestException('Birleştirme için tam 3 birim seçilmeli.');
    }
    if (new Set(unitIds).size !== unitIds.length) {
      throw new BadRequestException('Aynı birim birden çok slotta seçilemez.');
    }

    // Wrap the find-validate-delete-insert in a single transaction so a
    // mid-flight failure can't leave the player short 3 units with no
    // result spawned.  Replaces the previous "no transaction, retry fixes
    // it" trade-off comment — engine audit flagged MEDIUM, but the user
    // loses the merge cost AND the source units on a partial failure
    // which is worse than the simple retry case.
    // findBy { id: In(...) } is the TypeORM 0.3 form for the deprecated
    // findByIds — kept simple via the manager.findBy call below.
    const saved = await this.dataSource.transaction(async (manager) => {
      const txUnitRepo = manager.getRepository(PlayerUnit);
      const units = await txUnitRepo
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id IN (:...ids)', { ids: unitIds })
        .getMany();
      if (units.length !== 3) {
        throw new NotFoundException('Bir veya daha fazla birim bulunamadı.');
      }
      for (const u of units) {
        if (u.playerId !== playerId) {
          throw new BadRequestException(`Birim ${u.id} sana ait değil.`);
        }
        if (!u.isAlive) {
          throw new BadRequestException(`Birim ${u.id} canlı değil; birleştirilemez.`);
        }
      }

      // Same-type guard.  MERGE_RECIPES keys by source type, so mixed
      // types would need a much bigger lookup table — defer that until
      // the alternate-tier-2 (Sniper vs Engineer) branching feature
      // actually lands.  For now: same-type-only is the canonical
      // "Promosyon".
      const sourceType = units[0].type;
      if (!units.every((u) => u.type === sourceType)) {
        throw new BadRequestException('Birleştirme için 3 aynı tip birim gerekli.');
      }
      const resultType = MERGE_RECIPES[sourceType];
      if (!resultType) {
        throw new BadRequestException(
          `${sourceType} için bir üst tier yok — bu tip merge zincirinin tepesinde.`,
        );
      }
      const resultConfig = UNIT_CONFIGS[resultType];
      if (!resultConfig) {
        throw new BadRequestException(
          `Sonuç birimi config'i (${resultType}) backend'de tanımlı değil.`,
        );
      }

      await txUnitRepo.remove(units);
      const spawned = txUnitRepo.create({
        playerId,
        type: resultType,
        race: units[0].race,
        hp: resultConfig.hp,
        maxHp: resultConfig.hp,
        attack: resultConfig.attack,
        defense: resultConfig.defense,
        speed: resultConfig.speed,
        positionX: 0,
        positionY: 0,
        abilities: resultConfig.abilities,
        isAlive: true,
        level: 1,
      });
      const result = await txUnitRepo.save(spawned);
      this.logger.log(
        `Roster merge: player=${playerId} 3× ${sourceType} → 1× ${resultType} (id=${result.id})`,
      );
      return result;
    });

    // XP grant — merging is a meaningful progression action.  Reuse
    // XpSource.CONSTRUCTION (80 base XP) so the player sees the same
    // "+80 XP — Birleştirme" toast they get from training.  referenceId
    // dedupes a double-click.
    this.progression
      .awardXp({
        userId: playerId,
        source: XpSource.CONSTRUCTION,
        referenceId: `merge:${saved.id}`,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`awardXp(merge) skipped for ${playerId}: ${msg}`);
      });

    return saved;
  }
}
