import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { MergeService } from './merge.service';
import { MutationService } from './mutation.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { MergeUnitsDto } from './dto/merge-units.dto';
import { MergeConfirmDto } from './dto/merge-confirm.dto';
import { QueryMutationsDto } from './dto/query-mutations.dto';

@ApiTags('units')
@Controller('api/v1/units')
export class UnitsController {
  constructor(
    private readonly unitsService: UnitsService,
    private readonly mergeService: MergeService,
    private readonly mutationService: MutationService,
  ) {}

  // ─── Unit CRUD ────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new unit for a player' })
  @ApiResponse({ status: 201, description: 'Unit created' })
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Get('player/:playerId')
  @ApiOperation({ summary: "Get all active units for a player" })
  findByPlayer(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.unitsService.findByPlayer(playerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a unit by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.unitsService.findById(id);
  }

  // ─── Merge ────────────────────────────────────────────────────────────────

  @Post('merge')
  @ApiOperation({
    summary: 'Initiate a unit merge',
    description:
      'Validates both units, finds the matching mutation rule, calculates result preview, and stores an active merge session in Redis (TTL: 10 min). Call POST /units/merge/confirm with the returned sessionId to execute.',
  })
  @ApiResponse({ status: 201, description: 'Merge session created with preview' })
  initiateMerge(@Body() dto: MergeUnitsDto) {
    return this.mergeService.initiateMerge(dto);
  }

  @Post('merge/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm and execute a pending merge session',
    description:
      'Consumes the Redis merge session, creates the merged unit in PostgreSQL, and deactivates the two source units in a single transaction.',
  })
  @ApiResponse({ status: 200, description: 'Merged unit created' })
  confirmMerge(@Body() dto: MergeConfirmDto) {
    return this.mergeService.confirmMerge(dto);
  }

  @Delete('merge/session/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an active merge session' })
  @ApiResponse({ status: 204, description: 'Session cancelled' })
  cancelSession(
    @Param('sessionId') sessionId: string,
    @Query('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.mergeService.cancelSession(sessionId, playerId);
  }

  @Get('merge/session/:sessionId')
  @ApiOperation({ summary: 'Get status of an active merge session' })
  getSession(@Param('sessionId') sessionId: string) {
    return this.mergeService.getSession(sessionId);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  @Get('mutations')
  @ApiOperation({
    summary: 'Get the mutation tree',
    description: 'Returns all active mutation rules. Filter by race1, race2, or minTier.',
  })
  getMutations(@Query() query: QueryMutationsDto) {
    return this.mutationService
      .findAll({ race1: query.race1, race2: query.race2, minTier: query.minTier })
      .then((rules) => rules.map((r) => this.mutationService.toTreeEntry(r)));
  }

  @Get('mutations/:id')
  @ApiOperation({ summary: 'Get a specific mutation rule by ID' })
  getMutationRule(@Param('id', ParseUUIDPipe) id: string) {
    return this.mutationService.findRuleById(id).then((r) => this.mutationService.toTreeEntry(r));
  }
}
