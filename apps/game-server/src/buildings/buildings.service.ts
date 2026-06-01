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
import { EconomyService } from '../economy/economy.service';
import { StartConstructionDto } from './dto/start-construction.dto';
import { scaledDurationSec } from '../common/game-speed';
import {
  computeUpgradeRequirements,
  canUpgrade,
  describeBlockers,
} from './upgrade-requirements';
import { QuestProgressNotifier } from '../quest-progress/quest-progress-notifier.service';
import { ProgressionService } from '../progression/progression.service';
import { XpSource } from '../progression/config/level-config';

@Injectable()
export class BuildingsService {
  private readonly logger = new Logger(BuildingsService.name);

  constructor(
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    private readonly resources: ResourcesService,
    private readonly economyService: EconomyService,
    private readonly questProgress: QuestProgressNotifier,
    private readonly progression: ProgressionService,
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
    // Scaled duration honours GAME_SPEED_MULTIPLIER (default 1).
    // At 1000× a 30s build resolves in ~30ms — practically instant for
    // playtest runs. Status decision uses the scaled value too: a build
    // that scales to 0s skips CONSTRUCTING and lands ACTIVE outright.
    const scaledSec = scaledDurationSec(config.buildTimeSeconds);
    const completeAt = new Date(now.getTime() + scaledSec * 1000);

    const building = this.buildingRepo.create({
      playerId,
      type: dto.type,
      status: scaledSec === 0 ? BuildingStatus.ACTIVE : BuildingStatus.CONSTRUCTING,
      positionX: dto.positionX,
      positionY: dto.positionY,
      constructionStartedAt: now,
      constructionCompleteAt: scaledSec === 0 ? null : completeAt,
    });

    await this.buildingRepo.save(building);

    this.logger.log(
      `Player ${playerId} started construction of ${dto.type} at (${dto.positionX},${dto.positionY}). Complete at: ${completeAt.toISOString()}`,
    );

    if (building.status === BuildingStatus.ACTIVE) {
      await this.recalculateProductionRates(playerId);

      // QUEST PROGRESS HOOK — building.completed (instant-build path)
      // Only fires when the building goes straight to ACTIVE because
      // buildTimeSeconds was 0. The "build queue completes overdue
      // constructions" path is handled in completeOverdueConstructions().
      // Idempotency key is the buildingId so a retry of startConstruction
      // can't double-count — though in practice this row was just
      // created so the key is fresh.
      this.questProgress.notify(
        playerId,
        'buildings_built',
        `building:${building.id}`,
      );
    }

    return building;
  }

  async getBuildings(playerId: string): Promise<Building[]> {
    return this.buildingRepo.find({ where: { playerId } });
  }

  async getActiveBuildings(playerId: string): Promise<Building[]> {
    return this.buildingRepo.find({ where: { playerId, status: BuildingStatus.ACTIVE } });
  }

  /**
   * Upgrade an existing building by 1 level. Cost scales 1.5× per level on
   * top of the base cost (matches the estimate the /base/building/[slug]
   * detail page already shows). Recalculates production rates so the bump
   * shows up in the wallet pill within one tick.
   *
   * Throws:
   *   - NotFound when no building / not the player's
   *   - BadRequest when the building isn't ACTIVE (must be built first)
   *   - BadRequest on insufficient resources
   */
  async upgradeBuilding(playerId: string, buildingId: string): Promise<Building> {
    const building = await this.buildingRepo.findOne({ where: { id: buildingId, playerId } });
    if (!building) {
      throw new NotFoundException(`Building ${buildingId} not found for player ${playerId}.`);
    }
    if (building.status !== BuildingStatus.ACTIVE) {
      throw new BadRequestException(
        `Building ${buildingId} is ${building.status} — must be ACTIVE before upgrading.`,
      );
    }
    // Upgrade cooldown — if a prior upgrade hasn't elapsed yet, reject so
    // a rapid double-tap can't level the building twice in one frame.
    // `constructionCompleteAt` is reused here as the cooldown deadline:
    // upgrade keeps status=ACTIVE (the building goes on producing) but
    // sets a future completeAt so this branch blocks any second upgrade
    // until the duration runs out. The init-build path uses the same
    // field with status=CONSTRUCTING and isn't touched.
    const now = new Date();
    if (
      building.constructionCompleteAt &&
      building.constructionCompleteAt.getTime() > now.getTime()
    ) {
      const remainingSec = Math.ceil(
        (building.constructionCompleteAt.getTime() - now.getTime()) / 1000,
      );
      throw new BadRequestException(
        `Bir önceki yükseltme henüz tamamlanmadı (${remainingSec}s kaldı).`,
      );
    }

    // Tier-progression prerequisite check — HQ-driven gating so the
    // player can't tap "YÜKSELT" 9 times in a row on the command center
    // and reach the cap with nothing else built. Diğer binalar HQ'yu
    // geçemez, HQ kendisi yardımcı binaların seviyesine bağlı.
    // Frontend mirror'ı aynı fonksiyonu çağırır, aynı label çıkar.
    const targetLevel = building.level + 1;
    const ownedBuildings = await this.buildingRepo.find({
      where: { playerId },
    });
    const resourceSnap = await this.resources.getSnapshot(playerId);
    const requirements = computeUpgradeRequirements({
      building: {
        type: building.type,
        level: building.level,
        status: building.status,
      },
      targetLevel,
      ownedBuildings: ownedBuildings.map((b) => ({
        type: b.type,
        level: b.level,
        status: b.status,
      })),
      scienceBalance: resourceSnap.science,
    });
    if (!canUpgrade(requirements)) {
      throw new BadRequestException(
        `Yükseltme şartları eksik: ${describeBlockers(requirements)}`,
      );
    }

    const baseCfg = BUILDING_CONFIGS[building.type];
    const scale = Math.pow(1.5, building.level); // cost at level L → L+1
    // Lv 5+ upgrade'lerinde bilim de düşülür — computeUpgradeRequirements
    // ile aynı formül: targetLevel × 50. Cost objesinin science alanını
    // ResourcesService.deduct artık honour ediyor.
    const scienceCost = targetLevel >= 5 ? targetLevel * 50 : 0;
    const upgradeCost = {
      mineral: Math.round(baseCfg.cost.mineral * scale),
      gas: Math.round(baseCfg.cost.gas * scale),
      energy: Math.round(baseCfg.cost.energy * scale),
      science: scienceCost,
    };

    const canAfford = await this.resources.canAfford(playerId, upgradeCost);
    if (!canAfford) {
      const sciencePart = scienceCost > 0 ? ` ${scienceCost}◈` : '';
      throw new BadRequestException(
        `Insufficient resources. Required: ${upgradeCost.mineral}M ${upgradeCost.gas}G ${upgradeCost.energy}E${sciencePart}`,
      );
    }

    await this.resources.deduct(playerId, upgradeCost);

    // Upgrade duration — scales with level so high-tier upgrades take
    // longer. Base = building's own buildTimeSeconds, multiplier = level
    // (Lv 1→2 = 1× base, Lv 2→3 = 2× base, etc.). GAME_SPEED_MULTIPLIER
    // applied via the same scaledDurationSec helper used by initial
    // construction so a 1000× playtest collapses the cooldown to ~30ms.
    const upgradeDurationSec = scaledDurationSec(
      Math.max(baseCfg.buildTimeSeconds, 10) * building.level,
    );
    building.level += 1;
    building.constructionStartedAt = now;
    building.constructionCompleteAt = upgradeDurationSec === 0
      ? null
      : new Date(now.getTime() + upgradeDurationSec * 1000);
    await this.buildingRepo.save(building);

    this.logger.log(
      `Player ${playerId} upgraded ${building.type} (${buildingId}) to level ${building.level} (cooldown ${upgradeDurationSec}s).`,
    );

    // Re-derive per-tick production — most building types scale output
    // with level so the wallet trickle should bump immediately.
    await this.recalculateProductionRates(playerId);

    // XP grant — matches the +80 XP that completeOverdueConstructions gives
    // for new builds. Upgrade path is instant (no CONSTRUCTING state) so we
    // award inline rather than through the tick. referenceId uses upgrade
    // marker + building id + new level so awardXp's idempotency dedupes a
    // double-click without blocking legitimate later upgrades on the same
    // building (each level produces a distinct key).
    this.progression
      .awardXp({
        userId: playerId,
        source: XpSource.CONSTRUCTION,
        referenceId: `upgrade:${building.id}:lv${building.level}`,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`awardXp(upgrade) skipped for ${playerId}: ${msg}`);
      });

    return building;
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

    // QUEST PROGRESS HOOK — building.completed (queued-build path)
    // One increment per building that transitioned to ACTIVE this tick.
    // Idempotency keyed by buildingId so a second sweep over the same
    // overdue row (shouldn't happen — the WHERE clause filters to
    // CONSTRUCTING — but defense-in-depth) is a no-op on the api side.
    for (const building of overdue) {
      this.questProgress.notify(
        building.playerId,
        'buildings_built',
        `building:${building.id}`,
      );
    }

    // XP grant — XpSource.CONSTRUCTION (80 base XP per the level-config).
    // Fires via ProgressionService.awardXp which (a) writes player_levels,
    // (b) emits the 'progression.xp_gained' EventEmitter event that the
    // ProgressionGateway forwards to the socket room `user:${userId}`,
    // (c) the global <ProgressionToaster /> on the frontend renders the
    // "+80 XP — İnşa" toast. Without this hook the player taps İnşa
    // Başlat, watches the timer count down, sees the building turn ACTIVE,
    // and gets… nothing. The XP_BASE_AMOUNTS table promised 80 XP per
    // construction, this is where the promise is kept.
    //
    // Errors are swallowed — building completion already succeeded above,
    // and the XP grant is non-critical (player can level up via other
    // sources). Just log so a misconfigured ProgressionService doesn't
    // pin the tick.
    for (const building of overdue) {
      this.progression
        .awardXp({
          userId: building.playerId,
          source: XpSource.CONSTRUCTION,
          referenceId: `building:${building.id}`,
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`awardXp(construction) skipped for ${building.playerId}: ${msg}`);
        });
    }

    return overdue.length;
  }

  /**
   * Sums per-tick production across all active buildings using the DB-driven formula:
   *   production = basePerhour × levelScaleExponent^(level-1) / TICKS_PER_HOUR
   * Falls back to the legacy BUILDING_CONFIGS constants when no economy config exists.
   */
  async recalculateProductionRates(playerId: string): Promise<void> {
    const activeBuildings = await this.getActiveBuildings(playerId);

    let mineralPerTick = 0;
    let gasPerTick = 0;
    let energyPerTick = 0;
    let populationPerTick = 0;

    for (const building of activeBuildings) {
      const econRates = await this.economyService.computeBuildingRates(building.type, building.level);

      if (econRates.mineralPerTick !== 0 || econRates.gasPerTick !== 0 ||
          econRates.netEnergyPerTick !== 0 || econRates.populationPerTick !== 0) {
        mineralPerTick    += econRates.mineralPerTick;
        gasPerTick        += econRates.gasPerTick;
        energyPerTick     += econRates.netEnergyPerTick;
        populationPerTick += econRates.populationPerTick;
      } else {
        // Fallback to legacy constants when economy config is missing for this building type
        const legacyCfg = BUILDING_CONFIGS[building.type];
        mineralPerTick += legacyCfg.production.mineralPerTick;
        gasPerTick     += legacyCfg.production.gasPerTick;
        energyPerTick  += legacyCfg.production.energyPerTick - legacyCfg.energyConsumptionPerTick;
      }
    }

    await this.resources.updateRates(playerId, {
      mineralPerTick,
      gasPerTick,
      energyPerTick,
      populationPerTick,
    });
  }
}
