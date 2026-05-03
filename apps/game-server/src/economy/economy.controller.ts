import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { EconomyService } from './economy.service';
import { UpdateBuildingConfigDto } from './dto/update-building-config.dto';
import { UpdateStorageConfigDto } from './dto/update-storage-config.dto';
import { UpsertFeatureFlagDto } from './dto/upsert-feature-flag.dto';
import { ResourceType } from './entities/economy-storage-config.entity';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('admin/economy')
@UseGuards(HttpJwtGuard, AdminRoleGuard)
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  // ── Building configs ─────────────────────────────────────────────────────

  @Get('buildings')
  getAllBuildingConfigs() {
    return this.economyService.getAllBuildingConfigs();
  }

  @Patch('buildings/:buildingType')
  updateBuildingConfig(
    @Param('buildingType') buildingType: string,
    @Body() dto: UpdateBuildingConfigDto,
  ) {
    return this.economyService.updateBuildingConfig(buildingType, dto);
  }

  // ── Storage configs ──────────────────────────────────────────────────────

  @Get('storage')
  getAllStorageConfigs() {
    return this.economyService.getAllStorageConfigs();
  }

  @Patch('storage/:resourceType')
  updateStorageConfig(
    @Param('resourceType') resourceType: ResourceType,
    @Body() dto: UpdateStorageConfigDto,
  ) {
    return this.economyService.updateStorageConfig(resourceType, dto);
  }

  // ── Feature flags ────────────────────────────────────────────────────────

  @Get('flags')
  getAllFlags() {
    return this.economyService.getAllFeatureFlags();
  }

  @Put('flags/:flagKey')
  upsertFlag(
    @Param('flagKey') flagKey: string,
    @Body() dto: UpsertFeatureFlagDto,
  ) {
    return this.economyService.upsertFeatureFlag(flagKey, dto);
  }
}
