import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import {
  MergePreviewRequestDto,
  MergePreviewResponseDto,
} from './dto/merge-preview.dto';
import {
  ND_MAX_TIER,
  ND_MERGE_SLOT_COUNT,
  firstUnitAtTier,
  isNDRaceKey,
  NDRaceKey,
} from './data/nd-races';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACEHOLDER_RE = /^([a-z]+)-(\d+)-([A-Za-z0-9_-]+)$/;

interface ResolvedSlot {
  unitId: string;
  race: NDRaceKey;
  tier: number;
}

@Injectable()
export class MergePreviewService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
  ) {}

  async preview(
    userId: string,
    dto: MergePreviewRequestDto,
  ): Promise<MergePreviewResponseDto> {
    if (!isNDRaceKey(dto.race)) {
      return this.fail(dto, ['merge.error.invalidRace']);
    }

    const ids = dto.slots.map((s) => s.unitId);
    if (new Set(ids).size !== ids.length) {
      return this.fail(dto, ['merge.error.duplicateUnit']);
    }

    const resolved: ResolvedSlot[] = [];
    for (const slot of dto.slots) {
      const r = await this.resolveSlot(userId, dto.race, slot.unitId);
      resolved.push(r);
    }

    const reasons: string[] = [];

    const wrongRace = resolved.some((r) => r.race !== dto.race);
    if (wrongRace) reasons.push('merge.error.raceMismatch');

    const sourceTier = resolved[0]?.tier ?? 0;
    const mixedTier = resolved.some((r) => r.tier !== sourceTier);
    if (mixedTier) reasons.push('merge.error.mixedTier');

    if (sourceTier <= 0) reasons.push('merge.error.unknownTier');

    const resultTier = sourceTier + 1;
    if (sourceTier >= ND_MAX_TIER) reasons.push('merge.error.maxTier');

    if (reasons.length > 0) {
      return this.fail(dto, reasons);
    }

    const resultUnit = firstUnitAtTier(dto.race, resultTier);
    if (!resultUnit) {
      return this.fail(dto, ['merge.error.noResultUnit']);
    }

    return {
      canMerge: true,
      resultUnitId: this.buildResultUnitId(dto.race, resultTier, ids),
      resultTier,
      costs: this.computeCosts(sourceTier),
      consumed: ids,
    };
  }

  private async resolveSlot(
    userId: string,
    requestRace: NDRaceKey,
    unitId: string,
  ): Promise<ResolvedSlot> {
    if (UUID_RE.test(unitId)) {
      const unit = await this.unitRepo.findOne({
        where: { id: unitId },
        relations: ['game'],
      });
      if (!unit) throw new NotFoundException(`Unit ${unitId} not found`);
      if (!unit.game || unit.game.ownerId !== userId) {
        throw new ForbiddenException(`Unit ${unitId} is not owned by caller`);
      }
      // Real Unit entity lacks ND race/tier metadata today; fall back to the
      // request race + level so the recipe check at least exercises the path.
      return { unitId, race: requestRace, tier: unit.level };
    }

    const m = PLACEHOLDER_RE.exec(unitId);
    if (m && isNDRaceKey(m[1])) {
      const race = m[1] as NDRaceKey;
      const tier = Number.parseInt(m[2], 10);
      if (race !== requestRace) {
        throw new ForbiddenException(
          `Unit ${unitId} belongs to race ${race}, not ${requestRace}`,
        );
      }
      if (!Number.isFinite(tier) || tier < 1 || tier > ND_MAX_TIER) {
        throw new NotFoundException(`Unit ${unitId} has an invalid tier`);
      }
      return { unitId, race, tier };
    }

    throw new NotFoundException(`Unit ${unitId} not found`);
  }

  private computeCosts(sourceTier: number) {
    return {
      resourceA: 100 * sourceTier,
      resourceB: 200 * sourceTier,
      ...(sourceTier >= 4 ? { crystal: sourceTier - 3 } : {}),
    };
  }

  private buildResultUnitId(
    race: NDRaceKey,
    tier: number,
    sourceIds: string[],
  ): string {
    const seed = sourceIds.join('|');
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) | 0;
    }
    const tag = Math.abs(h).toString(36).slice(0, 6);
    return `${race}-${tier}-merge-${tag}`;
  }

  private fail(
    dto: MergePreviewRequestDto,
    reasons: string[],
  ): MergePreviewResponseDto {
    const sourceTier = (() => {
      const m = PLACEHOLDER_RE.exec(dto.slots[0]?.unitId ?? '');
      if (m) {
        const t = Number.parseInt(m[2], 10);
        return Number.isFinite(t) ? t : 1;
      }
      return 1;
    })();

    return {
      canMerge: false,
      resultUnitId: null,
      resultTier: null,
      costs: this.computeCosts(sourceTier),
      consumed: [],
      reasons,
    };
  }

  /** Sanity check used by tests; not part of the public API. */
  static get slotCount(): number {
    return ND_MERGE_SLOT_COUNT;
  }
}
