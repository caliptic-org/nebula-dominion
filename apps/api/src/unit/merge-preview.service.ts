import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import {
  MergePreviewRequestDto,
  MergePreviewResponseDto,
} from './dto/merge-preview.dto';
import {
  ND_MAX_TIER,
  ND_MERGE_SLOT_COUNT,
  ND_RACE_UNITS,
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

/** Pick a tier from a backend type code by matching against the race lex.
 *  `marine` → Marine entry → tier 1.  `mecha_walker` → Mecha Walker → tier 3.
 *  Unknown codes fall back to tier 1 — that matches how new server-side unit
 *  types (medic, ghost, drone…) which haven't been added to the lex yet
 *  behave: they're treated as starter-tier so the player can still merge
 *  them up.  Mirror of resolveUnitTier in apps/web/src/app/merge/page.tsx. */
function resolveTypeToTier(type: string, race: NDRaceKey): number {
  const prefix = type.split('_')[0].toLowerCase();
  const def = ND_RACE_UNITS[race].find((ru) =>
    ru.name.toLowerCase().replace(/\s+/g, '_').startsWith(prefix),
  );
  return def?.tier ?? 1;
}

@Injectable()
export class MergePreviewService {
  constructor(
    // Kept around even though resolveSlot reads from player_units now —
    // some callers may still rely on the units repo via DI signature.
    // The actual roster query goes through the raw DataSource below.
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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

    // Catch resolveSlot's NotFound / Forbidden throws and turn them into
    // a `canMerge: false` verdict instead of bubbling out as a 404 / 403.
    // The merge screen polls this endpoint speculatively (every time slot
    // selection changes), so a malformed or stale unitId is a normal
    // verdict — "this recipe doesn't merge" — not an error condition.
    // Without this, a single bad slot id forced the whole screen into a
    // toast bounce-off with no explanation.
    const resolved: ResolvedSlot[] = [];
    const resolveReasons: string[] = [];
    for (const slot of dto.slots) {
      try {
        const r = await this.resolveSlot(userId, dto.race, slot.unitId);
        resolved.push(r);
      } catch (err) {
        if (err instanceof NotFoundException) {
          resolveReasons.push('merge.error.unitNotFound');
        } else if (err instanceof ForbiddenException) {
          resolveReasons.push('merge.error.unitNotOwned');
        } else {
          throw err;
        }
      }
    }
    if (resolveReasons.length > 0) {
      // Dedup so 3 missing slots render as one reason chip, not three.
      const reasons = Array.from(new Set(resolveReasons));
      return this.fail(dto, reasons);
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
      // Player roster lives in `player_units` (game-server's schema, same DB).
      // The api's own `units` table is for in-match battle units — a totally
      // different concept.  Earlier this branch queried `units` and returned
      // unitNotFound for every real player UUID because they don't exist
      // there.  Raw SQL via the shared DataSource keeps us off cross-service
      // entity imports while still validating ownership + sourcing tier.
      const rows = (await this.dataSource.query(
        `SELECT id, type, level, player_id FROM player_units WHERE id = $1 LIMIT 1`,
        [unitId],
      )) as Array<{ id: string; type: string; level: number; player_id: string }>;
      const unit = rows[0];
      if (!unit) throw new NotFoundException(`Unit ${unitId} not found`);
      if (unit.player_id !== userId) {
        throw new ForbiddenException(`Unit ${unitId} is not owned by caller`);
      }
      // Backend type is bare ('marine', 'ghost', 'medic') — resolve to the
      // lex tier rather than the unit's `level` column (which is the
      // upgrade-level, NOT the merge-tier).
      const tier = resolveTypeToTier(unit.type, requestRace);
      return { unitId, race: requestRace, tier };
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
