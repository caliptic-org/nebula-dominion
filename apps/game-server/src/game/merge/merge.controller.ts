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
import { IsArray, IsString, ArrayMinSize, IsNumberString } from 'class-validator';
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
}
