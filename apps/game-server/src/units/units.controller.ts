import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { TrainUnitDto } from './dto/train-unit.dto';
import { MoveUnitDto } from './dto/move-unit.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Race } from '../matchmaking/dto/join-queue.dto';

@Controller('units')
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  /** GET /api/units — list alive units for the authenticated player */
  @Get()
  @UseGuards(HttpJwtGuard)
  async getUnits(@CurrentUser() userId: string) {
    return this.units.getUnits(userId);
  }

  /** POST /api/units/train — queue a unit for training */
  @Post('train')
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.CREATED)
  async trainUnit(@CurrentUser() userId: string, @Body() dto: TrainUnitDto) {
    return this.units.trainUnit(userId, dto);
  }

  /** GET /api/units/training-queue — get current training queue */
  @Get('training-queue')
  @UseGuards(HttpJwtGuard)
  async getTrainingQueue(@CurrentUser() userId: string) {
    return this.units.getTrainingQueue(userId);
  }

  /** POST /api/units/move — move a unit to a new grid position */
  @Post('move')
  @UseGuards(HttpJwtGuard)
  async moveUnit(@CurrentUser() userId: string, @Body() dto: MoveUnitDto) {
    return this.units.moveUnit(userId, dto);
  }

  /** POST /api/units/:id/upgrade — bump a unit one level (+10% stats) */
  @Post(':id/upgrade')
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.OK)
  async upgradeUnit(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.units.upgradeUnit(userId, id);
  }

  /** GET /api/units/configs/:race — public endpoint: unit type configs for a race */
  @Get('configs/:race')
  getConfigsForRace(@Param('race') race: Race) {
    return this.units.getRaceUnitConfigs(race);
  }
}
