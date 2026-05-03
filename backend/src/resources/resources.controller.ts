import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { ResourceType } from './entities/resource-config.entity';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly svc: ResourcesService) {}

  @Get('player/:playerId')
  getPlayerResources(@Param('playerId') playerId: string) {
    return this.svc.getPlayerResources(playerId);
  }

  @Post('player/:playerId/collect')
  @HttpCode(HttpStatus.OK)
  collectOffline(@Param('playerId') playerId: string) {
    return this.svc.collectOfflineAccumulation(playerId);
  }

  // ─── Admin endpoints (should be protected by admin guard in production) ───

  @Get('configs')
  getConfigs() {
    return this.svc.getAllConfigs();
  }

  @Patch('configs/:type')
  updateConfig(
    @Param('type') type: ResourceType,
    @Body() body: { baseRatePerHour?: number; capBase?: number; buildingExponent?: number },
  ) {
    return this.svc.updateConfig(type, body);
  }

  @Post('configs/reload')
  @HttpCode(HttpStatus.OK)
  reloadConfigs() {
    return this.svc.reloadConfigs();
  }

  @Get('flags/:key')
  getFlag(@Param('key') key: string) {
    return this.svc.getFlagValue(key);
  }

  @Post('flags')
  upsertFlag(
    @Body() body: { flagKey: string; value: Record<string, unknown>; segmentOverrides?: Record<string, Record<string, unknown>>; description?: string },
  ) {
    return this.svc.upsertFlag(body.flagKey, body.value, body.segmentOverrides, body.description);
  }
}
