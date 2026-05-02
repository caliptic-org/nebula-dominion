import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { TrainUnitDto } from './dto/train-unit.dto';
import { Race } from './entities/unit-type.entity';
import { UnitStatus } from './entities/unit.entity';

@ApiTags('units')
@Controller('api/v1/units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  // ── Unit Types ─────────────────────────────────────────────────────────────

  @Get('types')
  @ApiOperation({ summary: 'List all active unit types' })
  getAllUnitTypes() {
    return this.unitsService.getAllUnitTypes();
  }

  @Get('types/race/:race')
  @ApiOperation({ summary: 'List unit types by race (human | zerg | hybrid)' })
  getUnitTypesByRace(@Param('race') race: Race) {
    return this.unitsService.getUnitTypesByRace(race);
  }

  @Get('types/age/:ageNumber')
  @ApiOperation({ summary: 'List unit types for a specific age (tier tree)' })
  getUnitTypesByAge(@Param('ageNumber', ParseIntPipe) ageNumber: number) {
    return this.unitsService.getUnitTypesByAge(ageNumber);
  }

  @Get('types/code/:code')
  @ApiOperation({ summary: 'Get a unit type by its code' })
  getUnitTypeByCode(@Param('code') code: string) {
    return this.unitsService.getUnitTypeByCode(code);
  }

  // ── Training / Production Queue ────────────────────────────────────────────

  @Post('train')
  @ApiOperation({ summary: 'Start training a unit (enqueue to Redis production queue)' })
  @ApiResponse({ status: 201, description: 'Training job enqueued' })
  trainUnit(@Body() dto: TrainUnitDto) {
    return this.unitsService.trainUnit(dto);
  }

  @Post('players/:playerId/collect')
  @ApiOperation({ summary: 'Collect all completed units from the production queue' })
  collectUnits(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.unitsService.collectCompletedUnits(playerId);
  }

  @Delete('players/:playerId/queue/:jobId')
  @ApiOperation({ summary: 'Cancel a pending production job' })
  cancelTraining(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.unitsService.cancelTraining(playerId, jobId);
  }

  @Get('players/:playerId/queue')
  @ApiOperation({ summary: 'Get pending production queue for a player' })
  getProductionQueue(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.unitsService.getProductionQueue(playerId);
  }

  @Get('players/:playerId/queue/length')
  @ApiOperation({ summary: 'Get production queue length for a player' })
  getQueueLength(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.unitsService.getQueueLength(playerId);
  }

  // ── Player Units ───────────────────────────────────────────────────────────

  @Get('players/:playerId')
  @ApiOperation({ summary: 'List all units for a player' })
  @ApiQuery({ name: 'race', required: false, enum: Race })
  @ApiQuery({ name: 'ageNumber', required: false })
  @ApiQuery({ name: 'status', required: false, enum: UnitStatus })
  getPlayerUnits(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query('race') race?: Race,
    @Query('ageNumber', new DefaultValuePipe(undefined)) ageNumber?: string,
    @Query('status') status?: UnitStatus,
  ) {
    return this.unitsService.getPlayerUnits(playerId, {
      race,
      ageNumber: ageNumber !== undefined ? parseInt(ageNumber, 10) : undefined,
      status,
    });
  }

  @Get('players/:playerId/stats')
  @ApiOperation({ summary: 'Get unit count statistics for a player' })
  getPlayerUnitStats(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.unitsService.getPlayerUnitStats(playerId);
  }

  @Get(':unitId')
  @ApiOperation({ summary: 'Get a single unit by ID' })
  getUnit(@Param('unitId', ParseUUIDPipe) unitId: string) {
    return this.unitsService.getUnit(unitId);
  }

  @Patch(':unitId/heal')
  @ApiOperation({ summary: 'Heal a unit by a given amount' })
  healUnit(
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Query('amount', new DefaultValuePipe(50), ParseIntPipe) amount: number,
  ) {
    return this.unitsService.healUnit(unitId, amount);
  }

  @Delete('players/:playerId/:unitId')
  @ApiOperation({ summary: 'Delete (dismiss) a unit' })
  deleteUnit(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Param('unitId', ParseUUIDPipe) unitId: string,
  ) {
    return this.unitsService.deleteUnit(playerId, unitId);
  }
}
