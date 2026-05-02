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
} from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { ResourcesService } from '../resources/resources.service';
import { StartConstructionDto } from './dto/start-construction.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BUILDING_CONFIGS } from './buildings.constants';
import { BuildingType } from './entities/building.entity';

@Controller('buildings')
@UseGuards(HttpJwtGuard)
export class BuildingsController {
  constructor(
    private readonly buildings: BuildingsService,
    private readonly resources: ResourcesService,
  ) {}

  @Get()
  async listBuildings(@CurrentUser() userId: string) {
    return this.buildings.getBuildings(userId);
  }

  @Get('types')
  getBuildingTypes() {
    return Object.values(BuildingType).map((type) => ({
      type,
      ...BUILDING_CONFIGS[type],
    }));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async startConstruction(@CurrentUser() userId: string, @Body() dto: StartConstructionDto) {
    return this.buildings.startConstruction(userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async destroyBuilding(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) buildingId: string,
  ) {
    await this.buildings.destroyBuilding(userId, buildingId);
  }

  @Get('/resources')
  async getResources(@CurrentUser() userId: string) {
    return this.resources.getSnapshot(userId);
  }
}
