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
   *
   * Effect:
   *   - DELETE the 3 source rows
   *   - INSERT 1 new row with result type + result tier's UNIT_CONFIG stats
   *     run through applyRaceBonuses() so race multipliers (HUMAN +15% def
   *     +10% hp, ZERG +15% atk +30% spd -10% hp -15% def, etc.) are baked
   *     into the persisted row — same convention as completeTraining().
   *     Commander hp multiplier does NOT compose here (mergeRoster has
   *     never applied it; deferred until a UX decision is made about
   *     whether merged units inherit the active commander's bonus).
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
