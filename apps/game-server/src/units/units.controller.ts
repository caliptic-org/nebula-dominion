import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { TrainUnitDto } from './dto/train-unit.dto';
import { MoveUnitDto } from './dto/move-unit.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Race } from '../matchmaking/dto/join-queue.dto';

@Controller('api/v1/units')
@UseGuards(HttpJwtGuard)
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  /** GET /api/v1/units?playerId=<uuid>  — list alive units */
  @Get()
  async getUnits(
    @CurrentUser() userId: string,
    @Query('playerId') queryPlayerId?: string,
  ) {
    // Use authenticated user's ID; allow explicit query param override (e.g. admin/debug)
    const playerId = queryPlayerId ?? userId;
    return this.units.getUnits(playerId);
  }

  /** POST /api/v1/units/train — queue a unit for training */
  @Post('train')
  @HttpCode(HttpStatus.CREATED)
  async trainUnit(@CurrentUser() userId: string, @Body() dto: TrainUnitDto) {
    return this.units.trainUnit(userId, dto);
  }

  /** GET /api/v1/units/training-queue — get current training queue */
  @Get('training-queue')
  async getTrainingQueue(@CurrentUser() userId: string) {
    return this.units.getTrainingQueue(userId);
  }

  /** POST /api/v1/units/move — move a unit to a new grid position */
  @Post('move')
  async moveUnit(@CurrentUser() userId: string, @Body() dto: MoveUnitDto) {
    return this.units.moveUnit(userId, dto);
  }

  /** GET /api/v1/units/configs/:race — get unit type configs for a race */
  @Get('configs/:race')
  getConfigsForRace(@Param('race') race: Race) {
    return this.units.getRaceUnitConfigs(race);
  }
}
