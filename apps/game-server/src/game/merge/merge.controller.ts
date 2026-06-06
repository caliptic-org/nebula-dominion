import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsString, ArrayMinSize, IsNumberString, ArrayUnique } from 'class-validator';
import { HttpJwtGuard } from '../../auth/http-jwt.guard';
import { MergeService } from './merge.service';
import { GameService } from '../game.service';
import { ActionType } from '../dto/game-action.dto';
import { Race } from '../../matchmaking/dto/join-queue.dto';
import { MergeRecipe, MutationNode } from './merge.data';

class MergeUnitsDto {
  @IsString()
  roomId: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayUnique()
  @IsString({ each: true })
  unitIds: string[];

  @IsNumberString()
  sequenceNumber: string;
}

class MutateUnitDto {
  @IsString()
  roomId: string;

  @IsString()
  unitId: string;

  @IsString()
  mutationId: string;

  @IsNumberString()
  sequenceNumber: string;
}

interface AuthenticatedRequest {
  user?: { sub: string };
}

@Controller('units')
export class MergeController {
  constructor(
    private readonly mergeService: MergeService,
    private readonly gameService: GameService,
  ) {}

  /**
   * POST /units/merge
   * Merge two or more units in a live game room.
   * Requires JWT auth — player must own the room.
   */
  @UseGuards(HttpJwtGuard)
  @Post('merge')
  @HttpCode(HttpStatus.OK)
  async mergeUnits(@Req() req: AuthenticatedRequest, @Body() body: MergeUnitsDto) {
    const userId = req.user?.sub ?? '';
    const result = await this.gameService.processAction(userId, {
      roomId: body.roomId,
      type: ActionType.MERGE_UNITS,
      sequenceNumber: Number(body.sequenceNumber),
      payload: { unitIds: body.unitIds },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const mergeEvent = result.events.find((e) => e.type === 'units_merged');
    return {
      success: true,
      mergedUnit: mergeEvent?.data ?? null,
      stateHash: result.room?.stateHash,
    };
  }

  /**
   * POST /units/mutate
   * Apply a mutation to a merged unit in a live game room.
   * Requires JWT auth — player must own the room.
   */
  @UseGuards(HttpJwtGuard)
  @Post('mutate')
  @HttpCode(HttpStatus.OK)
  async mutateUnit(@Req() req: AuthenticatedRequest, @Body() body: MutateUnitDto) {
    const userId = req.user?.sub ?? '';
    const result = await this.gameService.processAction(userId, {
      roomId: body.roomId,
      type: ActionType.MUTATE_UNIT,
      sequenceNumber: Number(body.sequenceNumber),
      payload: { unitId: body.unitId, mutationId: body.mutationId },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const mutateEvent = result.events.find((e) => e.type === 'unit_mutated');
    return {
      success: true,
      unit: mutateEvent?.data ?? null,
      stateHash: result.room?.stateHash,
    };
  }

  /**
   * GET /units/merge/recipes
   * Returns the full combination book (all merge recipes).
   * Optionally filter by ?race=human|zerg|automaton
   */
  @Get('merge/recipes')
  getRecipes(@Query('race') race?: string): { recipes: MergeRecipe[] } {
    const raceEnum = race ? (race.toUpperCase() as Race) : undefined;
    return { recipes: this.mergeService.getAllRecipes(raceEnum) };
  }

  /**
   * GET /units/mutations/:unitType
   * Returns the full mutation tree for a merged unit type.
   */
  @Get('mutations/:unitType')
  getMutationTree(@Param('unitType') unitType: string): { unitType: string; mutations: MutationNode[] } {
    const tree = this.mergeService.getMutationTree(unitType);
    if (!tree) throw new NotFoundException(`No mutation tree found for unit type: ${unitType}`);
    return { unitType, mutations: tree };
  }

  /**
   * GET /units/merge/preview
   * Stateless preview of a merge attempt.  Mirrors the formula previously
   * baked into the frontend useMergePreview hook (BASE_SUCCESS table), but
   * served from the backend so the client cannot tamper with the projected
   * success rate.  No JWT required — the formula leaks nothing.
   *
   * Query params:
   *   sourceTier      — current unit tier (1..5)
   *   selectedCount   — units the player has earmarked
   *   slotCount       — recipe slot count (typically 2..4)
   *
   * Returns:
   *   promotedTier, successRate, projectedRate, canMerge, riskLabel
   */
  @Get('merge/preview')
  getMergePreview(
    @Query('sourceTier')    sourceTier?:    string,
    @Query('selectedCount') selectedCount?: string,
    @Query('slotCount')     slotCount?:     string,
  ): {
    promotedTier:  number;
    successRate:   number;
    projectedRate: number;
    canMerge:      boolean;
    riskLabel:     'GÜVENLİ' | 'RİSKLİ' | 'KRİTİK';
  } {
    // Defensive parsing — defaults match the frontend's deterministic
    // placeholder so an empty query string still returns sane numbers.
    const tier     = Math.max(1, Math.min(5, Number(sourceTier)    || 2));
    const selected = Math.max(0,            Number(selectedCount)  || 0);
    const slots    = Math.max(1,            Number(slotCount)      || 2);

    const BASE: Record<number, number> = { 2: 92, 3: 78, 4: 55 };
    const successRate   = BASE[tier] ?? 60;
    const promotedTier  = Math.min(5, tier + 1);
    const slotProgress  = selected / slots;
    const projectedRate = Math.round(successRate * slotProgress);
    const canMerge      = selected === slots;
    const riskLabel: 'GÜVENLİ' | 'RİSKLİ' | 'KRİTİK' =
      successRate >= 80 ? 'GÜVENLİ' : successRate >= 60 ? 'RİSKLİ' : 'KRİTİK';

    return { promotedTier, successRate, projectedRate, canMerge, riskLabel };
  }
}
