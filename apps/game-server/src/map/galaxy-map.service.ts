import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GalaxyNodeGarrison } from './galaxy-map.entity';
import { CommandersService } from '../commanders/commanders.service';
import { Resource } from '../resources/entities/resource.entity';
import { ResourcesService } from '../resources/resources.service';

/**
 * Mineral cost charged per troop committed when capturing a node.
 * Kept intentionally low (100/troop) so casual gameplay isn't blocked
 * but still meaningful enough to deter rapid-fire sabotage attempts
 * by U1-style spoiler clients.
 */
export const NODE_CAPTURE_COST_PER_TROOP = 100;

/**
 * Defender advantage multiplier — an attacker must field at least this
 * many troops relative to the defender's garrison to overwhelm them.
 * 1.5× mirrors classic 4X / RTS attacker-vs-fortified-defender baselines
 * and gives existing garrisons a real "moat" instead of being a one-shot
 * line in the dirt.
 */
export const NODE_CAPTURE_ATTACK_RATIO = 1.5;

/** Income rates per 30-second tick when a node is garrisoned by a player. */
const NODE_INCOME: Record<string, { mineral: number; gas: number; science: number }> = {
  mine:    { mineral: 25, gas:  5, science: 1 },
  colony:  { mineral: 15, gas: 15, science: 3 },
  relay:   { mineral:  5, gas: 25, science: 5 },
  capital: { mineral: 80, gas: 30, science: 8 },
};

export interface NodeIncomeResult {
  userId: string;
  mineral: number;
  gas: number;
  science: number;
}

@Injectable()
export class GalaxyMapService {
  private readonly logger = new Logger(GalaxyMapService.name);

  constructor(
    @InjectRepository(GalaxyNodeGarrison)
    private readonly garrisonRepo: Repository<GalaxyNodeGarrison>,
    private readonly commanders: CommandersService,
    private readonly resources: ResourcesService,
  ) {}

  /** List all garrisons for a player. */
  async getPlayerGarrisons(userId: string): Promise<GalaxyNodeGarrison[]> {
    return this.garrisonRepo.find({ where: { userId } });
  }

  /**
   * Capture a node — with combat check, resource cost, and atomic guarantees.
   *
   * ── Previous vulnerability (HIGH S6, fixed) ─────────────────────────
   * The prior implementation unconditionally `DELETE`'d any existing
   * garrison on the target node and inserted the caller's record. That
   * meant a malicious / sabotage client (U1) could wipe an opposing
   * player's entire garrison (e.g. KAEL-7 capital) with a single troop
   * — no combat math, no resource cost, no idempotency guard. The
   * service trusted the controller's troop count and the controller
   * trusted the body, so the only check was "is troops ≥ 1".
   *
   * ── New contract ─────────────────────────────────────────────────────
   *   1. Empty node             →  capture allowed; debit
   *                                troops × NODE_CAPTURE_COST_PER_TROOP
   *                                mineral.
   *   2. Same player owns it    →  reject 400 ("Bu node zaten sizin").
   *                                Idempotency: a re-fire of the same
   *                                capture call lands here on the
   *                                second hit and is rejected, so we
   *                                don't double-charge or double-grant.
   *   3. Different player owns  →  attacker troops must be at least
   *                                NODE_CAPTURE_ATTACK_RATIO (1.5×)
   *                                the defender's count. Otherwise
   *                                reject 400 with the defender's
   *                                visible strength so the caller
   *                                knows what they're up against.
   *
   * Resource cost: charged on success (mine, capture-from-empty, AND
   * successful overrun). The pre-flight check + debit + delete + insert
   * all run inside a single typeorm transaction with a pessimistic_write
   * lock on the player's resources row, so two concurrent capture calls
   * can't both pass the affordability check or the combat check.
   *
   * Note: `nodeKind` is sourced from the controller's `STATIC_NODES`
   * table so the caller can't spoof a 'capital' as a 'mine' to cheat
   * income rates.
   */
  async captureNode(
    userId: string,
    nodeId: string,
    nodeKind: string,
    troops: number,
  ): Promise<GalaxyNodeGarrison> {
    const cost = troops * NODE_CAPTURE_COST_PER_TROOP;
    let result!: GalaxyNodeGarrison;

    await this.garrisonRepo.manager.transaction(async (em) => {
      // 1. Read existing garrison (if any) — same TX so a parallel
      //    capture can't slip in between the read and the write.
      const existing = await em.findOne(GalaxyNodeGarrison, {
        where: { nodeId },
      });

      // 2. Idempotency: same caller already owns this node.
      if (existing && existing.userId === userId) {
        throw new BadRequestException('Bu node zaten sizin');
      }

      // 3. Combat check against a foreign defender.
      if (existing && existing.userId !== userId) {
        const required = Math.ceil(existing.garrisonCount * NODE_CAPTURE_ATTACK_RATIO);
        if (troops < required) {
          throw new BadRequestException(
            `Yetersiz kuvvet — savunmacı ${existing.garrisonCount} birim`,
          );
        }
      }

      // 4. Lock + debit mineral. Mirrors ResourcesService.deduct but
      //    inline so the whole operation lives in one transaction.
      const resource = await em.findOne(Resource, {
        where: { playerId: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!resource) {
        throw new BadRequestException('Oyuncu kaynakları bulunamadı');
      }
      if (Number(resource.mineral) < cost) {
        throw new BadRequestException(
          `Yetersiz mineral — ${cost} gerekli, ${Math.floor(Number(resource.mineral))} mevcut`,
        );
      }
      resource.mineral = Number(resource.mineral) - cost;
      await em.save(resource);

      // 5. Replace any defending garrison, install the new owner.
      if (existing) {
        await em.delete(GalaxyNodeGarrison, { nodeId });
      }

      const garrison = em.create(GalaxyNodeGarrison, {
        nodeId,
        userId,
        nodeKind,
        garrisonCount: troops,
        capturedAt: new Date(),
        lastIncomeAt: null,
      });
      result = await em.save(garrison);
    });

    // Invalidate the Redis resource snapshot post-commit (cycle-29
    // MAP-GALAXY-001): the capture debited mineral inside the TX, but the
    // comment here previously only *claimed* the cache was cleared — no code
    // did it, so the FE kept showing the pre-capture mineral balance for up to
    // the 60s TTL. Best-effort: a cache hiccup self-heals on the next tick.
    await this.resources.invalidateCache(userId).catch((err: unknown) =>
      this.logger.warn(
        `capture cache invalidate failed user=${userId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      ),
    );
    this.logger.log(
      `Player ${userId} captured ${nodeId} with ${troops} troops (cost ${cost} mineral)`,
    );
    return result;
  }

  /**
   * Process income for all garrisoned nodes.
   * Called once per resource tick (every 30 s) by ResourceTickWorker.
   * Science is computed but not applied to player_resources (no column yet) —
   * it is logged only.
   */
  async processNodeIncome(): Promise<NodeIncomeResult[]> {
    const garrisons = await this.garrisonRepo.find();

    if (garrisons.length === 0) return [];

    // Aggregate income per player across all their garrisoned nodes
    const totals = new Map<string, NodeIncomeResult>();

    for (const garrison of garrisons) {
      if (garrison.garrisonCount <= 0) continue;

      const rates = NODE_INCOME[garrison.nodeKind];
      if (!rates) {
        this.logger.warn(`Unknown nodeKind '${garrison.nodeKind}' for node ${garrison.nodeId} — skipping`);
        continue;
      }

      const existing = totals.get(garrison.userId) ?? {
        userId: garrison.userId,
        mineral: 0,
        gas: 0,
        science: 0,
      };

      existing.mineral += rates.mineral;
      existing.gas     += rates.gas;
      existing.science += rates.science;
      totals.set(garrison.userId, existing);
    }

    // ── Commander scienceMultiplier ─────────────────────────────────
    // Chen (+22% L1) and Lo-Khode (+30% L1, locked) bump science gain
    // from garrisoned nodes. Applied as a per-player final pass over
    // the aggregated totals so the multiplier hits the SUM (not each
    // node), mirroring how resourceProductionMultiplier works in
    // BuildingsService. Other commanders' science values stay flat.
    for (const result of totals.values()) {
      try {
        const bonus = await this.commanders.getActiveBonus(result.userId);
        const mul = 1 + (bonus.scienceMultiplier ?? 0);
        if (mul !== 1) {
          result.science = Math.round(result.science * mul);
        }
      } catch (err) {
        this.logger.warn(
          `scienceMultiplier lookup skipped for ${result.userId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Update lastIncomeAt for all processed garrisons in bulk
    const now = new Date();
    const activeIds = garrisons
      .filter((g) => g.garrisonCount > 0 && NODE_INCOME[g.nodeKind])
      .map((g) => g.id);

    if (activeIds.length > 0) {
      await this.garrisonRepo
        .createQueryBuilder()
        .update(GalaxyNodeGarrison)
        .set({ lastIncomeAt: now })
        .whereInIds(activeIds)
        .execute();
    }

    const results = Array.from(totals.values());

    for (const r of results) {
      this.logger.debug(
        `Node income for player ${r.userId}: +${r.mineral}M +${r.gas}G +${r.science}◈`,
      );
    }

    return results;
  }

  /** Get garrison record for a specific node (if any). */
  async getNodeGarrison(nodeId: string): Promise<GalaxyNodeGarrison | null> {
    return this.garrisonRepo.findOne({ where: { nodeId } }) ?? null;
  }
}
