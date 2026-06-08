import {
  BadRequestException,
  ForbiddenException,
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
  computeMergeCost,
  getUnitConfigsByRace,
  applyRaceBonuses,
  unitSupplyCost,
} from './constants/race-configs.constants';
import { Race } from '../matchmaking/dto/join-queue.dto';
import { BuildingType, BuildingStatus } from '../buildings/entities/building.entity';
import { Building } from '../buildings/entities/building.entity';
import { ResourcesService } from '../resources/resources.service';
import { scaledDurationSec } from '../common/game-speed';
import { ProgressionService } from '../progression/progression.service';
import { XpSource } from '../progression/config/level-config';
import { CommandersService } from '../commanders/commanders.service';
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

/**
 * Hard cap on the number of in-flight (not-yet-complete) training queue
 * rows a single player can hold. Without this guard, trainUnit() only
 * validated building + count and a determined client could stack thousands
 * of parallel orders — each completed row grants CONSTRUCTION XP (80 base)
 * via awardXp, so 10 000 rows = 800 000 XP burst, fast-tracking past the
 * intended XP curve and bypassing the building-tier age gate.
 *
 * The cap pairs with the per-source XP daily cap in level-config.ts; queue
 * cap is the first wall, XP daily cap the second. 50 is comfortably above
 * what a normal player builds (a typical roster bottoms-up training session
 * queues 5–15 at a time) but low enough that the XP exploit becomes
 * insignificant: 50 × 80 = 4 000 XP per full-queue cycle, still under the
 * 5 000 daily CONSTRUCTION cap.
 */
const MAX_TRAINING_QUEUE_PER_PLAYER = 50;

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
    private readonly commanders: CommandersService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Look up the player's race from the api-owned `users.race` column.
   * Game-server doesn't own a User entity; we hit the shared DB directly
   * (same pattern BasesService.getPlayerRace and progression/gates.service.ts
   * use to read `users.race`). Returns null if the user row is missing or
   * race hasn't been set yet, in which case trainUnit() will reject the
   * race-check defensively.
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
   * Queue a unit for training.
   * Validates the building type, checks affordability, deducts resources and
   * inserts a TrainingQueue entry.
   *
   * CHAIN-UNITS-TRAIN race fix: pre-fix this endpoint enforced only
   * `requiredBuilding` (which keys to building.type) and `trainable!==false`
   * — it never consulted users.race. So a Beast-race account whose
   * users.race=='beast' could POST {unitType:'marine', buildingId:<their
   * Human barracks>} and mint a Human marine, provided they had a Human
   * barracks lying around (e.g. seeded by the legacy selectRace whitelist
   * mitigations, or via the auto-base/dev seeders that drop a starter
   * Barracks regardless of race). The frontend filters the catalog via
   * getUnitConfigsByRace but the path /units/train was authoritative-blind
   * to race. Sibling endpoint BasesService.queueUnit (cycle 6) already
   * carries this race-match gate; this method mirrors it to close the
   * /base/production UI's actual code path.
   *
   * New contract:
   *   - BadRequestException if `users.race` is null/undefined (race not
   *     chosen yet — pre-rated player should not be able to train units).
   *   - ForbiddenException with "Bu birim ırkına uygun değil" if the
   *     unit config's race doesn't match the player's persisted race.
   *   - Existing requiredBuilding + trainable + queue-cap checks remain
   *     untouched as the second / defense-in-depth layer.
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

    // ── Race-match gate (CHAIN-UNITS-TRAIN) ──────────────────────────
    // Mirrors BasesService.queueUnit's race check. Pre-fix the only race
    // signal the path consulted was the unit's own native race; the
    // player's `users.race` was never read. A null/missing race row is
    // rejected with BadRequestException (race must be chosen first); a
    // mismatch is rejected with ForbiddenException so the FE can route
    // to the race-selection screen vs. surface a generic 400 toast.
    const playerRace = await this.getPlayerRace(playerId);
    if (!playerRace) {
      throw new BadRequestException('Irk seçilmemiş');
    }
    if (config.race !== playerRace) {
      throw new ForbiddenException('Bu birim ırkına uygun değil');
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

    // ── Queue cap guard (HIGH F6-econ) ──────────────────────────────
    // Count in-flight (not-yet-complete) queue rows for this player and
    // refuse the train order if adding `count` more rows would push past
    // MAX_TRAINING_QUEUE_PER_PLAYER. Done BEFORE resource deduction so a
    // refused order doesn't burn minerals/gas. The check is best-effort
    // (race-safe enough for a single player's tab; not transactionally
    // serialised) — even with concurrent clicks the worst case is a
    // handful over the cap, which the XP daily cap still mops up.
    const inFlightCount = await this.queueRepo.count({
      where: { playerId, isComplete: false },
    });
    if (inFlightCount + count > MAX_TRAINING_QUEUE_PER_PLAYER) {
      throw new BadRequestException(
        `Eğitim kuyruğu doldu (max ${MAX_TRAINING_QUEUE_PER_PLAYER} birim). Mevcut: ${inFlightCount}`,
      );
    }

    // ── Population (supply) cap guard (ECON #6) ─────────────────────
    // population was a dead readout: trainUnit deducted M/G/E but never a
    // supply cost, so army size was unbounded and the "Nüfus" bar meant
    // nothing. Each unit now costs supply = unitSupplyCost(config); the
    // standing roster + in-flight queue + this batch must fit under
    // populationCap. Computed FRESH from the roster every call (combat
    // deaths aren't persisted, so the alive roster IS the standing army) —
    // never a stored counter, so it can't drift into a false lockout.
    // Done BEFORE resource deduction so a capped order doesn't burn
    // minerals. Fail-open if cap is unset/0 (never brick training on a
    // misconfigured cap).
    const capSnap = await this.resources.getSnapshot(playerId);
    const popCap = Number(capSnap.populationCap ?? 0);
    if (popCap > 0) {
      const popUsed = await this.computePopulationUsed(playerId);
      const batchSupply = unitSupplyCost(config) * count;
      if (popUsed + batchSupply > popCap) {
        throw new BadRequestException(
          `Nüfus kapasitesi yetersiz: ${popUsed} + ${batchSupply} > ${popCap}. ` +
            `Birimleri birleştirerek (Promosyon Töreni) yer açın.`,
        );
      }
    }

    // ── Commander bonus ─────────────────────────────────────────────
    // trainCostMultiplier: negative = discount (Azurath: -0.20 → -20%).
    // trainSpeedMultiplier: negative = faster (Reyes: -0.18 → -18% time).
    // Read once per train call; fan out to cost + duration below.
    const cmdBonus = await this.commanders.getActiveBonus(playerId);
    const costMul = 1 + (cmdBonus.trainCostMultiplier ?? 0);
    const speedMul = 1 + (cmdBonus.trainSpeedMultiplier ?? 0);
    // Clamp so a freak high-level Tier-5 commander can't take a cost to
    // <= 0 or duration to negative. Floor at 5% of base (95% max discount).
    const safeCostMul = Math.max(0.05, costMul);
    const safeSpeedMul = Math.max(0.05, speedMul);

    const batchCost = {
      mineral: Math.round((config.cost.mineral ?? 0) * count * safeCostMul),
      gas:     Math.round((config.cost.gas ?? 0) * count * safeCostMul),
      energy:  Math.round((config.cost.energy ?? 0) * count * safeCostMul),
      // science isn't part of unit training cost today but multiply
      // defensively so future tier-5+ units that DO need science scale
      // correctly without revisiting this branch.
      science: Math.round(((config.cost as { science?: number }).science ?? 0) * count * safeCostMul),
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
      now.getTime() +
        Math.max(0, Math.round(scaledDurationSec(config.trainTimeSeconds) * count * safeSpeedMul)) *
          1000,
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
    // Reserve the supply immediately so the HUD "Nüfus" bar reflects the
    // in-flight order (display only — enforcement recomputed fresh above).
    await this.syncPopulation(playerId);
    this.logger.log(
      `Player ${playerId} queued training of ${dto.unitType} in building ${dto.buildingId}. Completes at: ${completesAt.toISOString()}`,
    );

    return entry;
  }

  /**
   * Derived population (supply) used — ECON #6. Sums unitSupplyCost across the
   * player's standing roster (alive units) plus in-flight training-queue
   * orders. This is the single source of truth for both the trainUnit cap
   * check and the displayed value; nothing is cached in a running counter, so
   * it cannot drift (combat deaths aren't persisted, merges hard-delete rows —
   * the roster always reflects reality).
   */
  private async computePopulationUsed(playerId: string): Promise<number> {
    const aliveRows = (await this.unitRepo
      .createQueryBuilder('u')
      .select('u.type', 'type')
      .addSelect('COUNT(*)', 'cnt')
      .where('u.playerId = :playerId', { playerId })
      .andWhere('u.isAlive = true')
      .groupBy('u.type')
      .getRawMany()) as Array<{ type: UnitType; cnt: string }>;

    const queuedRows = (await this.queueRepo
      .createQueryBuilder('q')
      .select('q.unitType', 'type')
      .addSelect('SUM(q.count)', 'cnt')
      .where('q.playerId = :playerId', { playerId })
      .andWhere('q.isComplete = false')
      .groupBy('q.unitType')
      .getRawMany()) as Array<{ type: UnitType; cnt: string }>;

    let used = 0;
    for (const row of [...aliveRows, ...queuedRows]) {
      const cfg = UNIT_CONFIGS[row.type];
      if (!cfg) continue;
      used += unitSupplyCost(cfg) * Number(row.cnt ?? 0);
    }
    return used;
  }

  /**
   * Recompute derived supply and persist it to player_resources.population so
   * the HUD reads an honest value. Best-effort: a failure here must never
   * break training/merge (the cap check doesn't rely on the stored column).
   */
  private async syncPopulation(playerId: string): Promise<void> {
    try {
      const used = await this.computePopulationUsed(playerId);
      await this.resources.setPopulation(playerId, used);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`population sync skipped for ${playerId}: ${msg}`);
    }
  }

  /**
   * Disband (permanently dismiss) one unit — ECON #6 supply-release valve.
   *
   * REQUIRED for the population cap to be safe: combat deaths aren't persisted
   * and several TRAINABLE units (siege_tank, ghost, medic, queen, ultralisk)
   * have no merge recipe, so without this a roster full of them at the cap
   * would be a permanent training lockout. Disband hard-deletes the row (same
   * convention as mergeRoster) and re-syncs population so the freed supply is
   * immediately available + reflected on the HUD. Guarantees every unit type
   * has an escape hatch.
   */
  async disbandUnit(
    playerId: string,
    unitId: string,
  ): Promise<{ disbanded: string; freedSupply: number }> {
    const unit = await this.unitRepo.findOne({
      where: { id: unitId, playerId, isAlive: true },
    });
    if (!unit) {
      throw new NotFoundException('Birim bulunamadı veya size ait değil');
    }
    const cfg = UNIT_CONFIGS[unit.type];
    const freedSupply = cfg ? unitSupplyCost(cfg) : 0;
    await this.unitRepo.remove(unit);
    await this.syncPopulation(playerId);
    this.logger.log(
      `Player ${playerId} disbanded unit ${unitId} (${unit.type}) — freed ${freedSupply} supply`,
    );
    return { disbanded: unitId, freedSupply };
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
   *
   * Race bonuses are baked into the persisted stats here — base stats from
   * UNIT_CONFIGS run through applyRaceBonuses() (HUMAN +15% def +10% hp,
   * ZERG +15% atk +30% spd -10% hp -15% def, etc.) BEFORE the commander hp
   * multiplier composes on top of the post-bonus HP. Order matters:
   *   final = round(round(base * raceMult) * commanderMult)
   * for HP; attack/defense/speed get the race multiplier only (no
   * commander stats yet for those four).
   *
   * NOTE: rows created before this fix (2026-06-06) carry pre-bonus stats
   * and will read low compared to freshly-trained units. A backfill
   * migration that normalizes historical rows is deferred — TODO if/when
   * the gap is player-visible enough to matter.
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
      // ── Commander hpMultiplier ─────────────────────────────────────
      // Korova (+20% L1, locked T5) — apply at spawn time so the unit's
      // persisted HP / maxHp reflects the bonus from the moment it lands
      // in the roster. Read once per queue entry; one player owns one
      // commander so the same multiplier applies to all units in the
      // batch. Mid-battle changes to active commander don't retro-apply
      // (units keep the HP they spawned with — same convention as
      // upgradeUnit() which writes stats at upgrade time).
      const cmdBonus = await this.commanders.getActiveBonus(entry.playerId);
      const hpMul = 1 + (cmdBonus.hpMultiplier ?? 0);
      // Race bonus first (applyRaceBonuses.effectiveStats), commander hp
      // multiplier composes on top of the race-adjusted HP.
      const raced = applyRaceBonuses(config).effectiveStats;
      const spawnHp = Math.round(raced.hp * hpMul);
      for (let i = 0; i < spawnCount; i += 1) {
        const unit = this.unitRepo.create({
          playerId: entry.playerId,
          type: entry.unitType,
          race: entry.race,
          hp: spawnHp,
          maxHp: spawnHp,
          attack: raced.attack,
          defense: raced.defense,
          speed: raced.speed,
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

    // Minting moved units from in-flight queue → alive roster (net supply
    // unchanged), but recompute each affected player's population so the HUD
    // stays exact regardless of which path produced the rows.
    const affected = [...new Set(overdue.map((e) => e.playerId))];
    for (const pid of affected) {
      await this.syncPopulation(pid);
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
   *  Charges a 1.5^currentLevel-scaled resource cost (mineral/gas/energy
   *  from UNIT_CONFIGS) AND writes a future `upgradeCompletedAt` whose
   *  duration scales 60 * 2^level seconds (honouring
   *  GAME_SPEED_MULTIPLIER). Mirrors buildings.service.upgradeBuilding's
   *  cost+cooldown pattern — pre-fix this endpoint was free and
   *  uncapped, letting a player chain 9 POSTs straight to L10 for free.
   *
   *  Errors:
   *    - NotFound: unit missing / not alive / not owned by caller
   *    - BadRequest: at max level (10)
   *    - BadRequest: prior upgrade cooldown still ticking
   *    - BadRequest: insufficient resources (M/G/E) for level cost
   *
   *  Merge-only units (Sniper/Mecha/Genetic/Captain etc.) carry
   *  zeroed-out `cost` in UNIT_CONFIGS — they're explicitly free to
   *  upgrade today (cost scales from 0 → 0 at every level). Cooldown
   *  still applies so the rate-limit gate catches them even if the
   *  wallet check is a no-op. */
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

    // Cooldown gate — reject if the previous upgrade's deadline hasn't
    // elapsed. Mirrors buildings.service's constructionCompleteAt check.
    // Units that have never been upgraded have upgradeCompletedAt=null
    // and pass straight through.
    const now = new Date();
    if (
      unit.upgradeCompletedAt &&
      unit.upgradeCompletedAt.getTime() > now.getTime()
    ) {
      const remainingSec = Math.ceil(
        (unit.upgradeCompletedAt.getTime() - now.getTime()) / 1000,
      );
      throw new BadRequestException(
        `Bir önceki yükseltme henüz tamamlanmadı (${remainingSec}s kaldı).`,
      );
    }

    // Per-level cost scaling — base cost from UNIT_CONFIGS times
    // 1.5^currentLevel. Pre-fix the endpoint debited nothing and
    // capped only at L10, so a player could fire 9 POSTs and reach
    // max stats instantly. The 1.5× curve matches the building
    // upgrade scale in buildings.service.
    const baseCfg = UNIT_CONFIGS[unit.type];
    const upgradeCost = (() => {
      if (!baseCfg) {
        // Defensive fallback: unknown unit type has no base cost
        // record. Skip the wallet check (cooldown gate still applies)
        // rather than 500 — same convention as completeTraining's
        // `if (!config) continue` branch above.
        return { mineral: 0, gas: 0, energy: 0 };
      }
      const scale = Math.pow(1.5, unit.level);
      return {
        mineral: Math.round((baseCfg.cost.mineral ?? 0) * scale),
        gas: Math.round((baseCfg.cost.gas ?? 0) * scale),
        energy: Math.round((baseCfg.cost.energy ?? 0) * scale),
      };
    })();

    const hasCost =
      upgradeCost.mineral > 0 ||
      upgradeCost.gas > 0 ||
      upgradeCost.energy > 0;
    if (hasCost) {
      const canAfford = await this.resources.canAfford(playerId, upgradeCost);
      if (!canAfford) {
        throw new BadRequestException(
          `Insufficient resources. Required: ${upgradeCost.mineral}M ${upgradeCost.gas}G ${upgradeCost.energy}E (upgrade ${unit.type} → L${unit.level + 1})`,
        );
      }
      await this.resources.deduct(playerId, upgradeCost);
    }

    // Cooldown duration — 60 * 2^level seconds, scaled by
    // GAME_SPEED_MULTIPLIER through scaledDurationSec. At L1→L2 the
    // baseline is 120s; at L9→L10 it's 30720s (~8.5h). At 1000× game
    // speed this collapses to ~30ms, keeping QA iteration fast.
    const cooldownSec = scaledDurationSec(60 * Math.pow(2, unit.level));

    unit.level += 1;
    const mul = 1.1;
    unit.maxHp = Math.round(unit.maxHp * mul);
    unit.hp = Math.min(unit.hp + Math.round(unit.maxHp * 0.2), unit.maxHp);
    unit.attack = Math.round(unit.attack * mul);
    unit.defense = Math.round(unit.defense * mul);
    unit.upgradeCompletedAt =
      cooldownSec === 0
        ? null
        : new Date(now.getTime() + cooldownSec * 1000);
    const saved = await this.unitRepo.save(unit);
    this.logger.log(
      `Player ${playerId} upgraded unit ${unitId} (${unit.type}) to L${unit.level} (cost ${upgradeCost.mineral}M ${upgradeCost.gas}G ${upgradeCost.energy}E, cooldown ${cooldownSec}s).`,
    );
    return saved;
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
   *   - player can afford computeMergeCost(sourceType) — mineral/gas/
   *     science scaled by source tier (100M/200G per tier; +1 science at
   *     tier 4+). Mirrors the FE preview pane's cost line so the player
   *     never sees a "100M" cost in the UI and gets debited 0M by the
   *     backend (the ECON-MERGE-FREE-UPGRADE exploit, see below).
   *
   * Effect (in transaction):
   *   - DEDUCT the merge cost via ResourcesService.deduct (atomic
   *     conditional UPDATE — throws BadRequest "Yetersiz kaynak" if the
   *     balance is short, in which case the source units stay intact).
   *   - DELETE the 3 source rows
   *   - INSERT 1 new row with result type + result tier's UNIT_CONFIG stats
   *     run through applyRaceBonuses() so race multipliers (HUMAN +15% def
   *     +10% hp, ZERG +15% atk +30% spd -10% hp -15% def, etc.) are baked
   *     into the persisted row — same convention as completeTraining().
   *     Commander hp multiplier does NOT compose here (mergeRoster has
   *     never applied it; deferred until a UX decision is made about
   *     whether merged units inherit the active commander's bonus).
   *
   * EXPLOIT FIX (ECON-MERGE-FREE-UPGRADE, audit cycle 6): pre-fix the
   * mergeRoster body computed `resultType` from MERGE_RECIPES and dove
   * straight into remove/save with no resource debit. apps/api's
   * MergePreviewService.computeCosts (apps/api/src/unit/merge-preview.
   * service.ts:177) displayed `mineral = 100*sourceTier, gas = 200*
   * sourceTier, crystal = sourceTier-3` to the player in the merge
   * preview pane, but the actual POST /units/merge-roster path never
   * read those costs. A determined player could grind starter Marines
   * (50M / 10E each) and stack-merge all the way to Captain (T5) for
   * the cost of the source training alone — bypassing the 100/200/300/
   * 400 M+G ladder that the FE economy curve assumes. With Marine cost
   * 50M × 3 = 150M for the bottom rung versus the intended 100M+200G
   * merge cost, the exploit roughly halved the cost AND traded zero
   * gas where 200G was meant to gate progression.
   *
   * New contract (POST):
   *   1. resolve sourceType & resultType (unchanged)
   *   2. computeMergeCost(sourceType) → { mineral, gas, energy, science }
   *   3. resources.deduct(playerId, cost) — throws BadRequest "Yetersiz
   *      kaynak" if balance is insufficient; the FE catches & surfaces.
   *      The atomic conditional UPDATE inside deduct serialises concurrent
   *      merges so two parallel POSTs can't both pass the predicate
   *      against a balance that only covers one merge.
   *   4. only AFTER successful deduct: remove the 3 source units, insert
   *      the spawned result. Order is critical — a deduct failure must
   *      not consume the source roster.
   *
   * NOTE: rows created before this fix (2026-06-06) carry pre-bonus stats
   * and will read low. Backfill migration deferred — TODO if/when the
   * gap is player-visible enough to matter.
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

    // Wrap the find-validate-deduct-delete-insert in a single transaction
    // so a mid-flight failure can't leave the player short 3 units with no
    // result spawned. Replaces the previous "no transaction, retry fixes
    // it" trade-off comment — engine audit flagged MEDIUM, but the user
    // loses the merge cost AND the source units on a partial failure
    // which is worse than the simple retry case.
    //
    // Note on the cost deduct: ResourcesService.deduct runs its own atomic
    // conditional UPDATE on player_resources (cycle-10 fix). That UPDATE
    // is implicitly enrolled in this transaction because TypeORM 0.3's
    // dataSource.transaction binds the manager to a per-tx connection and
    // ResourcesService reads the same shared DataSource. The deduct's
    // UPDATE participates in the same tx, so a downstream throw rolls back
    // the resource debit alongside the (yet-unstarted) unit consumption.
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

      // ── Cost deduct BEFORE consuming source units ──────────────────
      // ECON-MERGE-FREE-UPGRADE fix: charge the player the same cost the
      // FE preview pane shows BEFORE we remove anything. If deduct throws
      // BadRequest("Yetersiz kaynak"), the transaction rolls back and the
      // source units stay alive — the player just sees a 400 toast and
      // can keep gathering resources.
      const mergeCost = computeMergeCost(sourceType);
      const hasCost =
        mergeCost.mineral > 0 ||
        mergeCost.gas > 0 ||
        mergeCost.energy > 0 ||
        mergeCost.science > 0;
      if (hasCost) {
        // resources.deduct surfaces BadRequest("Yetersiz kaynak") on
        // insufficient balance — propagate as-is so the FE's existing
        // translate-backend-error mapping picks it up.
        await this.resources.deduct(playerId, mergeCost);
      }

      await txUnitRepo.remove(units);
      // Apply race bonuses to the result tier's base stats before insert
      // — keeps persisted rows consistent with completeTraining()'s
      // post-fix convention. See JSDoc above for the deferred-backfill
      // note on historical rows.
      const racedResult = applyRaceBonuses(resultConfig).effectiveStats;
      const spawned = txUnitRepo.create({
        playerId,
        type: resultType,
        race: units[0].race,
        hp: racedResult.hp,
        maxHp: racedResult.hp,
        attack: racedResult.attack,
        defense: racedResult.defense,
        speed: racedResult.speed,
        positionX: 0,
        positionY: 0,
        abilities: resultConfig.abilities,
        isAlive: true,
        level: 1,
      });
      const result = await txUnitRepo.save(spawned);
      this.logger.log(
        `Roster merge: player=${playerId} 3× ${sourceType} → 1× ${resultType} (id=${result.id}, cost ${mergeCost.mineral}M ${mergeCost.gas}G ${mergeCost.energy}E ${mergeCost.science}◈)`,
      );
      return result;
    });

    // Merge hard-deleted 3 source rows and inserted 1 → supply freed.
    // Recompute so the freed population shows up immediately.
    await this.syncPopulation(playerId);

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
