import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechNode } from './entities/tech-node.entity';
import { PlayerResearch } from './entities/player-research.entity';
import {
  ResearchStatus,
  ResearchCategory,
  NodeState,
  TechNodeWithState,
} from './types/research.types';

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    @InjectRepository(TechNode)
    private readonly techNodeRepo: Repository<TechNode>,
    @InjectRepository(PlayerResearch)
    private readonly playerResearchRepo: Repository<PlayerResearch>,
  ) {}

  async getTechTree(
    playerId: string,
    race: string,
    category?: ResearchCategory,
  ): Promise<TechNodeWithState[]> {
    const where: Record<string, unknown> = { race };
    if (category) where['category'] = category;

    const nodes = await this.techNodeRepo.find({ where, order: { tier: 'ASC', rowPosition: 'ASC' } });
    const playerRecords = await this.playerResearchRepo.find({
      where: { playerId },
      relations: ['node'],
    });

    return this.mergeNodesWithPlayerState(nodes, playerRecords);
  }

  async getNode(nodeKey: string, playerId: string): Promise<TechNodeWithState> {
    const node = await this.techNodeRepo.findOne({ where: { nodeKey } });
    if (!node) throw new NotFoundException(`Tech node '${nodeKey}' not found`);

    const playerRecords = await this.playerResearchRepo.find({
      where: { playerId },
      relations: ['node'],
    });

    const [withState] = this.mergeNodesWithPlayerState([node], playerRecords);
    return withState;
  }

  async startResearch(playerId: string, nodeKey: string): Promise<PlayerResearch> {
    const node = await this.techNodeRepo.findOne({ where: { nodeKey } });
    if (!node) throw new NotFoundException(`Tech node '${nodeKey}' not found`);

    const playerRecords = await this.playerResearchRepo.find({
      where: { playerId },
      relations: ['node'],
    });

    // Check no other research is already active
    const activeResearch = playerRecords.find((r) => r.status === ResearchStatus.ACTIVE);
    if (activeResearch) {
      throw new ConflictException(
        `Player already has active research: ${activeResearch.node.nodeKey}`,
      );
    }

    // Check if already researched or researching this node
    const existing = playerRecords.find((r) => r.nodeId === node.id);
    if (existing) {
      if (existing.status === ResearchStatus.COMPLETED) {
        throw new ConflictException(`Node '${nodeKey}' is already completed`);
      }
      if (existing.status === ResearchStatus.ACTIVE) {
        throw new ConflictException(`Node '${nodeKey}' is already being researched`);
      }
    }

    // Verify all prerequisites are completed
    const completedNodeIds = new Set(
      playerRecords
        .filter((r) => r.status === ResearchStatus.COMPLETED)
        .map((r) => r.node.nodeKey),
    );
    const unmetPrereqs = (node.prerequisites as string[]).filter(
      (prereq) => !completedNodeIds.has(prereq),
    );
    if (unmetPrereqs.length > 0) {
      throw new BadRequestException(
        `Prerequisites not met: ${unmetPrereqs.join(', ')}`,
      );
    }

    // Check if node is available given the prerequisites
    const [nodeState] = this.mergeNodesWithPlayerState([node], playerRecords);
    if (nodeState.state === NodeState.LOCKED) {
      throw new BadRequestException(`Node '${nodeKey}' is locked`);
    }

    const now = new Date();
    const completionAt = new Date(now.getTime() + node.durationSeconds * 1000);

    const record = this.playerResearchRepo.create({
      playerId,
      nodeId: node.id,
      status: ResearchStatus.ACTIVE,
      startedAt: now,
      estimatedCompletionAt: completionAt,
      completedAt: null,
      cancelledAt: null,
    });

    const saved = await this.playerResearchRepo.save(record);
    this.logger.log(`Research started: player=${playerId} node=${nodeKey} eta=${completionAt.toISOString()}`);
    return saved;
  }

  async cancelResearch(playerId: string, nodeKey: string): Promise<PlayerResearch> {
    const node = await this.techNodeRepo.findOne({ where: { nodeKey } });
    if (!node) throw new NotFoundException(`Tech node '${nodeKey}' not found`);

    const record = await this.playerResearchRepo.findOne({
      where: { playerId, nodeId: node.id, status: ResearchStatus.ACTIVE },
    });
    if (!record) {
      throw new NotFoundException(
        `No active research found for node '${nodeKey}' by player ${playerId}`,
      );
    }

    record.status = ResearchStatus.CANCELLED;
    record.cancelledAt = new Date();
    const saved = await this.playerResearchRepo.save(record);
    this.logger.log(`Research cancelled: player=${playerId} node=${nodeKey}`);
    return saved;
  }

  async getQueue(playerId: string): Promise<{
    active: (TechNodeWithState & { researchId: string }) | null;
  }> {
    const activeRecord = await this.playerResearchRepo.findOne({
      where: { playerId, status: ResearchStatus.ACTIVE },
      relations: ['node'],
    });

    if (!activeRecord) {
      return { active: null };
    }

    const progress = this.computeProgress(activeRecord);
    const nodeWithState: TechNodeWithState & { researchId: string } = {
      researchId: activeRecord.id,
      ...this.nodeToDto(activeRecord.node),
      state: NodeState.RESEARCHING,
      progress,
      startedAt: activeRecord.startedAt.toISOString(),
      estimatedCompletionAt: activeRecord.estimatedCompletionAt.toISOString(),
    };

    // Auto-complete if server time has passed
    if (progress >= 100) {
      await this.completeResearch(activeRecord);
      nodeWithState.state = NodeState.COMPLETED;
      nodeWithState.progress = 100;
    }

    return { active: nodeWithState };
  }

  async getProgress(
    nodeKey: string,
    playerId: string,
  ): Promise<{ nodeKey: string; state: NodeState; progress: number; remainingSec: number | null }> {
    const node = await this.techNodeRepo.findOne({ where: { nodeKey } });
    if (!node) throw new NotFoundException(`Tech node '${nodeKey}' not found`);

    const record = await this.playerResearchRepo.findOne({
      where: { playerId, nodeId: node.id },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      return { nodeKey, state: NodeState.LOCKED, progress: 0, remainingSec: null };
    }

    if (record.status === ResearchStatus.COMPLETED) {
      return { nodeKey, state: NodeState.COMPLETED, progress: 100, remainingSec: 0 };
    }

    if (record.status === ResearchStatus.CANCELLED) {
      return { nodeKey, state: NodeState.AVAILABLE, progress: 0, remainingSec: null };
    }

    const progress = this.computeProgress(record);
    const remainingSec = Math.max(
      0,
      Math.ceil((record.estimatedCompletionAt.getTime() - Date.now()) / 1000),
    );

    if (progress >= 100) {
      await this.completeResearch(record);
      return { nodeKey, state: NodeState.COMPLETED, progress: 100, remainingSec: 0 };
    }

    return { nodeKey, state: NodeState.RESEARCHING, progress, remainingSec };
  }

  private computeProgress(record: PlayerResearch): number {
    const totalMs = record.estimatedCompletionAt.getTime() - record.startedAt.getTime();
    const elapsedMs = Date.now() - record.startedAt.getTime();
    if (totalMs <= 0) return 100;
    return Math.min(100, Math.round((elapsedMs / totalMs) * 100));
  }

  private async completeResearch(record: PlayerResearch): Promise<void> {
    record.status = ResearchStatus.COMPLETED;
    record.completedAt = new Date();
    await this.playerResearchRepo.save(record);
    this.logger.log(`Research auto-completed: player=${record.playerId} node=${record.nodeId}`);
  }

  private mergeNodesWithPlayerState(
    nodes: TechNode[],
    playerRecords: PlayerResearch[],
  ): TechNodeWithState[] {
    const completedKeys = new Set(
      playerRecords
        .filter((r) => r.status === ResearchStatus.COMPLETED)
        .map((r) => r.node.nodeKey),
    );
    const activeMap = new Map<string, PlayerResearch>(
      playerRecords
        .filter((r) => r.status === ResearchStatus.ACTIVE)
        .map((r) => [r.nodeId, r]),
    );

    return nodes.map((node) => {
      const active = activeMap.get(node.id);
      const isCompleted = completedKeys.has(node.nodeKey);

      let state: NodeState;
      let progress: number | undefined;
      let startedAt: string | undefined;
      let estimatedCompletionAt: string | undefined;

      if (isCompleted) {
        state = NodeState.COMPLETED;
      } else if (active) {
        state = NodeState.RESEARCHING;
        progress = this.computeProgress(active);
        startedAt = active.startedAt.toISOString();
        estimatedCompletionAt = active.estimatedCompletionAt.toISOString();
      } else {
        const prereqsMet = (node.prerequisites as string[]).every((p) => completedKeys.has(p));
        state = prereqsMet ? NodeState.AVAILABLE : NodeState.LOCKED;
      }

      return {
        ...this.nodeToDto(node),
        state,
        progress,
        startedAt,
        estimatedCompletionAt,
      };
    });
  }

  private nodeToDto(node: TechNode): Omit<TechNodeWithState, 'state' | 'progress' | 'startedAt' | 'estimatedCompletionAt'> {
    return {
      id: node.id,
      nodeKey: node.nodeKey,
      race: node.race,
      category: node.category,
      tier: node.tier,
      rowPosition: node.rowPosition,
      name: node.name,
      description: node.description,
      icon: node.icon,
      effectText: node.effectText,
      cost: {
        minerals: node.costMineral,
        gas: node.costGas,
        timeSec: node.durationSeconds,
      },
      prerequisites: node.prerequisites as string[],
      effects: node.effects,
    };
  }
}
