import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GalaxyNodeGarrison } from './galaxy-map.entity';

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
  ) {}

  /** List all garrisons for a player. */
  async getPlayerGarrisons(userId: string): Promise<GalaxyNodeGarrison[]> {
    return this.garrisonRepo.find({ where: { userId } });
  }

  /**
   * Capture a node: create or update the garrison entry.
   * If the node was already garrisoned by this player, troops are added.
   * If it was garrisoned by another player, the old garrison is replaced.
   */
  async captureNode(
    userId: string,
    nodeId: string,
    nodeKind: string,
    troops: number,
  ): Promise<GalaxyNodeGarrison> {
    // Remove any existing garrison on this node (could be different player)
    await this.garrisonRepo.delete({ nodeId });

    const garrison = this.garrisonRepo.create({
      nodeId,
      userId,
      nodeKind,
      garrisonCount: troops,
      capturedAt: new Date(),
      lastIncomeAt: null,
    });

    return this.garrisonRepo.save(garrison);
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
