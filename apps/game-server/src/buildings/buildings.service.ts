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
  SCIENCE_GATE_MIN_LEVEL,
  scienceCostForLevel,
} from './upgrade-requirements';
import { QuestProgressNotifier } from '../quest-progress/quest-progress-notifier.service';
import { ProgressionService } from '../progression/progression.service';
import { XpSource } from '../progression/config/level-config';
import { CommandersService } from '../commanders/commanders.service';

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
    private readonly commanders: CommandersService,
  ) {}

  /** Resolve the player's active commander bonus once and return safe
   *  multipliers for cost + speed. Centralised so startConstruction and
   *  upgradeBuilding speak the same defensive clamps (95% max
   *  discount / faster — at L30 with stacked race-bonuses the raw value
   *  could otherwise overflow to 0 cost or instant build). */
  private async resolveBuildModifiers(playerId: string): Promise<{
    costMul: number;
    speedMul: number;
  }> {
    const cmd = await this.commanders.getActiveBonus(playerId);
    return {
      costMul: Math.max(0.05, 1 + (cmd.buildCostMultiplier ?? 0)),
      speedMul: Math.max(0.05, 1 + (cmd.buildSpeedMultiplier ?? 0)),
    };
  }

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

    const { costMul, speedMul } = await this.resolveBuildModifiers(playerId);
    const adjustedCost = {
      mineral: Math.round((config.cost.mineral ?? 0) * costMul),
      gas: Math.round((config.cost.gas ?? 0) * costMul),
      energy: Math.round((config.cost.energy ?? 0) * costMul),
      science: Math.round(((config.cost as { science?: number }).science ?? 0) * costMul),
    };
    const canAfford = await this.resources.canAfford(playerId, adjustedCost);
    if (!canAfford) {
      throw new BadRequestException(
        `Insufficient resources. Required: ${adjustedCost.mineral}M ${adjustedCost.gas}G ${adjustedCost.energy}E`,
      );
    }

    await this.resources.deduct(playerId, adjustedCost);

    const now = new Date();
    // Scaled duration honours GAME_SPEED_MULTIPLIER (default 1).
    // At 1000× a 30s build resolves in ~30ms — practically instant for
    // playtest runs. Status decision uses the scaled value too: a build
    // that scales to 0s skips CONSTRUCTING and lands ACTIVE outright.
    // Commander buildSpeedMultiplier folds in here (e.g. Aurelius L1
    // -22% → speedMul 0.78 → 22% faster).
    const scaledSec = Math.max(
      0,
      Math.round(scaledDurationSec(config.buildTimeSeconds) * speedMul),
    );
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
   * Upgrade an existing building by 1 level. Cost scales
   * BUILDING_UPGRADE_COST_EXP× (1.22 as of cycle 17 BAL-01) per level on
   * top of the base cost — tuned to track the 1.18 yield curve so a
   * building's output keeps pace with its own next-upgrade price (payback
   * under ~3 days at Lv50; old 1.5 exponent stalled the loop past ~Lv30).
   * Recalculates production rates so the bump shows up in the wallet pill
   * within one tick.
   *
   * cycle 17 BAL-2: the command_center (HQ) now carries a non-zero base
   * cost ({ 200, 50, 100 }, see buildings.constants.ts) so this same
   * baseCfg.cost × EXP^level formula gives HQ leveling a real, back-loaded
   * price. Previously HQ base was { 0, 0, 0 } and 0 × EXP^level stayed 0,
   * so the HQ — which drives every age gate — could be leveled to the cap
   * for free, gated only by support-building prereqs. Age advancement is
   * now gated by economy too.
   *
   * Throws:
   *   - NotFound when no building / not the player's
   *   - BadRequest when the building isn't ACTIVE (must be built first)
   *   - BadRequest on insufficient resources
   */
  /** Level cap — the per-tier prereq table runs out at this point anyway.
   *  54 matches the story-doc max progression (Age 6 max-level HQ).  Mirror
   *  this on the frontend `upgrade-requirements.ts` so the button greys out
   *  before the player hits a backend rejection. */
  private static readonly MAX_BUILDING_LEVEL = 54;

  /**
   * Per-level upgrade COST exponent: cost = baseCost × EXP^level.
   *
   * cycle 20 ECON-BAL-01/02 — the production-curve rebalance.
   *
   * The cycle-17 pair (cost 1.22 / yield 1.18) claimed "payback ~3 days at
   * Lv50", but the audit re-derived it as ~1 HOUR: the 2880-ticks/day income
   * multiplier dwarfs the tiny 1.22/1.18 = 1.034×/level cost-vs-yield drift,
   * so a Lv54 extractor self-funded its next upgrade almost instantly AND
   * compounded to ~279M mineral/day (base-wide income in the BILLIONS/day,
   * which hit the 10T storage cap in under a day and made every sink trivial
   * — the economy stopped being a constraint by mid-Age-2).
   *
   * Fix: lower the yield exponent to BUILDING_YIELD_EXP = 1.10 (1.10^53 = 148×
   * vs the old 6451× → a Lv54 extractor now earns ~6.4M/day, base-wide income
   * in the low-tens-of-millions/day) and set cost = 1.17 so the cost/yield
   * ratio is 1.17/1.10 = 1.0636×/level — over the 0→54 span cost outpaces a
   * single building's income by ~29×, putting a late upgrade's payback back
   * in the intended multi-day window. The change is self-targeting: at low
   * level 1.10 vs 1.18 differ little (L5: 1.46× vs 1.94×), so early-game
   * pacing is roughly preserved; the compounding only bites at high level
   * where the inflation lived.
   *
   * Tunable in ONE place — both the live cost calc (L~250) and the production
   * scaling (recalculateProductionRates) read these constants, not literals.
   */
  private static readonly BUILDING_UPGRADE_COST_EXP = 1.17;

  /** Per-level production YIELD exponent: rate = base × EXP^(level-1).
   *  Lowered 1.18 → 1.10 in cycle 20 (ECON-BAL-01) — see the cost-exponent
   *  JSDoc above. Shared by the mineral/gas/energy AND science legacy-fallback
   *  scaling so they stay in lockstep with the cost curve. */
  private static readonly BUILDING_YIELD_EXP = 1.1;

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
    if (building.level >= BuildingsService.MAX_BUILDING_LEVEL) {
      throw new BadRequestException(
        `Bina maks seviyeye ulaştı (Lv ${BuildingsService.MAX_BUILDING_LEVEL}).`,
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
    // cost at level L → L+1. cycle 17 BAL-01: exponent lowered 1.5 → 1.22
    // (BUILDING_UPGRADE_COST_EXP) so cost tracks the 1.18 yield curve and
    // upgrades stay self-funding past Lv30. See constant JSDoc.
    const scale = Math.pow(BuildingsService.BUILDING_UPGRADE_COST_EXP, building.level);
    // Lv 5+ upgrade'lerinde bilim de düşülür — computeUpgradeRequirements
    // ile AYNI formülü (scienceCostForLevel) paylaşır, böylece istek kontrolü
    // ve düşüm asla drift edemez. Cycle 17 BAL-02: 50→5 ucuzlatıldı + PvP
    // bağımlılığı kırıldı; cycle 20 ECON-BAL-05: 1.15^lvl ölçeklemesi eklendi
    // (geç oyunda gerçek yumuşak kapı). scienceCostForLevel gate'i kendi
    // içinde uygular (SCIENCE_GATE_MIN_LEVEL altında 0 döner).
    const scienceCost = scienceCostForLevel(targetLevel);
    // Commander buildCostMultiplier applies to upgrades too. Without this
    // an active Malphas / Aurelius / Lokhode discount would only help
    // first-time construction; players would feel the bonus disappear
    // the moment they tried to upgrade.
    const { costMul: upgradeCostMul, speedMul: upgradeSpeedMul } =
      await this.resolveBuildModifiers(playerId);
    const upgradeCost = {
      mineral: Math.round(baseCfg.cost.mineral * scale * upgradeCostMul),
      gas: Math.round(baseCfg.cost.gas * scale * upgradeCostMul),
      energy: Math.round(baseCfg.cost.energy * scale * upgradeCostMul),
      science: Math.round(scienceCost * upgradeCostMul),
    };

    const canAfford = await this.resources.canAfford(playerId, upgradeCost);
    if (!canAfford) {
      const sciencePart = upgradeCost.science > 0 ? ` ${upgradeCost.science}◈` : '';
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
    // Commander buildSpeedMultiplier reduces it further.
    const upgradeDurationSec = Math.max(
      0,
      Math.round(
        scaledDurationSec(Math.max(baseCfg.buildTimeSeconds, 10) * building.level) *
          upgradeSpeedMul,
      ),
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
    // Cycle 17 BAL-02: science trickle from research-flavoured labs
    // (academy / cyber_core / hatchery sciencePerTick). The DB-driven
    // economy_building_configs path (computeBuildingRates) has no science
    // column, so science is ALWAYS sourced from the static BUILDING_CONFIGS
    // here, applying the same 1.18^(level-1) level scaling the legacy
    // mineral/gas/energy fallback uses. Accumulated outside the
    // econRates branch so it works whether or not the DB config is seeded.
    let sciencePerTick = 0;

    for (const building of activeBuildings) {
      const econRates = await this.economyService.computeBuildingRates(building.type, building.level);

      // Science is config-only (no DB equivalent) — scale it with the
      // same per-level curve as the legacy fallback regardless of which
      // production branch the currencies take below.
      const scienceBase = BUILDING_CONFIGS[building.type].production.sciencePerTick ?? 0;
      if (scienceBase > 0) {
        const sciLevelScale = Math.pow(BuildingsService.BUILDING_YIELD_EXP, Math.max(0, building.level - 1));
        sciencePerTick += Math.round(scienceBase * sciLevelScale);
      }

      if (econRates.mineralPerTick !== 0 || econRates.gasPerTick !== 0 ||
          econRates.netEnergyPerTick !== 0 || econRates.populationPerTick !== 0) {
        mineralPerTick    += econRates.mineralPerTick;
        gasPerTick        += econRates.gasPerTick;
        energyPerTick     += econRates.netEnergyPerTick;
        populationPerTick += econRates.populationPerTick;
      } else {
        // ── LEVEL SCALING IN LEGACY FALLBACK ────────────────────────
        // economy_building_configs table was created in migration
        // 1714723200000 but never seeded in production. With an empty
        // DB the previous code path returned the FLAT base per-tick
        // rate regardless of building.level — so upgrading a building
        // from Lv 1 to Lv 10 only ever made it MORE EXPENSIVE without
        // changing what it produced. Players reported "üs gelişim
        // hesaplarında hata olabilirmi" because it's a real bug:
        // the upgrade cost scaled exponentially (then 1.5^level, now
        // 1.22^level per cycle 17 BAL-01), yield did not scale at all.
        //
        // Apply the same 1.18^(level-1) scaling the DB-driven path
        // uses, so until economy_building_configs is properly seeded
        // (deferred — separate seed migration) the fallback at least
        // gives the player the intended +18% per-level gain.
        // Lv 1 → 1.0× · Lv 5 → 1.94× · Lv 10 → 4.43× · Lv 20 → 24×
        const legacyCfg = BUILDING_CONFIGS[building.type];
        const legacyScale = Math.pow(BuildingsService.BUILDING_YIELD_EXP, Math.max(0, building.level - 1));
        mineralPerTick += Math.round(legacyCfg.production.mineralPerTick * legacyScale);
        gasPerTick     += Math.round(legacyCfg.production.gasPerTick * legacyScale);
        // Energy: PRODUCTION scales with level; CONSUMPTION stays FLAT.
        // Cycle 20 (ECON-BAL-03) briefly scaled consumption too, but cycle 21
        // proved that scaling each building's NET by its own level can brown
        // out an unevenly-leveled base — e.g. solar L1 + factory L10 →
        // −12·1.10^9 ≈ −28 ⇒ a net-negative base — a UX regression the prior
        // flat-consumption model never had ("sign preserved" was provably
        // false). Reverted: a base with any producer stays energy-positive.
        // The cycle-20 yield nerf (1.18→1.10) already slows the energy surplus
        // so it is no longer trivially surplus-forever; a real energy-as-hard-
        // constraint (deficit penalty rather than scaled drain) is deferred to
        // a dedicated design.
        energyPerTick  += Math.round(
          legacyCfg.production.energyPerTick * legacyScale -
            legacyCfg.energyConsumptionPerTick,
        );
      }
    }

    // ── Commander resource production bonus ─────────────────────────
    // Prime, Ulrek, Kthala give a flat % to all extracted resources.
    // Applied as the LAST step so it multiplies the sum across all
    // buildings (correct economic behaviour — an active Prime
    // at L10 gives +14.5% to TOTAL mineral output, not +10% per
    // mineral building). Population is unaffected by commander
    // bonuses today; it tracks active worker assignments.
    const cmd = await this.commanders.getActiveBonus(playerId);
    const prodMul = 1 + (cmd.resourceProductionMultiplier ?? 0);
    if (prodMul !== 1) {
      mineralPerTick = Math.round(mineralPerTick * prodMul);
      gasPerTick     = Math.round(gasPerTick * prodMul);
      energyPerTick  = Math.round(energyPerTick * prodMul);
      // Science (research output) benefits from the same production
      // commander bonus — cycle 17 BAL-02.
      sciencePerTick = Math.round(sciencePerTick * prodMul);
    }

    await this.resources.updateRates(playerId, {
      mineralPerTick,
      gasPerTick,
      energyPerTick,
      populationPerTick,
      sciencePerTick,
    });
  }
}
