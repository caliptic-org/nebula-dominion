import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { ResourcesService } from '../resources/resources.service';
import { StartConstructionDto } from './dto/start-construction.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BUILDING_CONFIGS } from './buildings.constants';
import { BuildingType } from './entities/building.entity';

@Controller('buildings')
export class BuildingsController {
  constructor(
    private readonly buildings: BuildingsService,
    private readonly resources: ResourcesService,
  ) {}

  /** GET /api/buildings — list owned buildings for the authenticated player */
  @Get()
  @UseGuards(HttpJwtGuard)
  async listBuildings(@CurrentUser() userId: string) {
    return this.buildings.getBuildings(userId);
  }

  /** GET /api/buildings/types — public: building catalog (costs, times, caps) */
  @Get('types')
  getBuildingTypes() {
    return Object.values(BuildingType).map((type) => ({
      type,
      ...BUILDING_CONFIGS[type],
    }));
  }

  /** POST /api/buildings — start construction of a new building */
  @Post()
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.CREATED)
  async startConstruction(@CurrentUser() userId: string, @Body() dto: StartConstructionDto) {
    return this.buildings.startConstruction(userId, dto);
  }

  /** POST /api/buildings/:id/upgrade — upgrade an existing building */
  @Post(':id/upgrade')
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.OK)
  async upgradeBuilding(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) buildingId: string,
  ) {
    return this.buildings.upgradeBuilding(userId, buildingId);
  }

  /** DELETE /api/buildings/:id — destroy a building */
  @Delete(':id')
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async destroyBuilding(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) buildingId: string,
  ) {
    await this.buildings.destroyBuilding(userId, buildingId);
  }

  /** GET /api/buildings/resources — live resource snapshot */
  @Get('/resources')
  @UseGuards(HttpJwtGuard)
  async getResources(@CurrentUser() userId: string) {
    return this.resources.getSnapshot(userId);
  }

  /**
   * POST /api/buildings/resources/battle-reward
   * Credits battle rewards (mineral, gas, science) to the authenticated player.
   * Called by BattleScreen.onContinue after a battle resolves on the client.
   * The body mirrors the `rewards` object from POST /battles (battles-stub).
   */
  @Post('/resources/battle-reward')
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.OK)
  async grantBattleReward(
    @CurrentUser() userId: string,
    @Body()
    body: {
      mineral?: number;
      gas?: number;
      science?: number;
      xp?: number;
    },
  ) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('reward body required');
    }
    const grant: { mineral?: number; gas?: number; science?: number } = {};
    if (body.mineral && body.mineral > 0) grant.mineral = Math.floor(body.mineral);
    if (body.gas     && body.gas     > 0) grant.gas     = Math.floor(body.gas);
    if (body.science && body.science > 0) grant.science = Math.floor(body.science);

    if (Object.keys(grant).length === 0) {
      return this.resources.getSnapshot(userId);
    }

    return this.resources.grant(userId, grant);
  }
}
