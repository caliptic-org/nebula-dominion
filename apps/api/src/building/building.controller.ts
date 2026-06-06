import { Controller, Get, Delete, Param, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BuildingService } from './building.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('buildings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('buildings')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  // NB. POST /buildings USED TO LIVE HERE — a legacy shim that called
  // BuildingService.create(). It had **no resource cost, no position
  // uniqueness check, no maxPerPlayer cap, and no construction queue
  // gate**. A live-audit smoke test instantiated dozens of free
  // production buildings on the same gameId by hammering the route.
  // (ECON-C6-03, audit cycle 6.)
  //
  // The canonical construction path lives in
  // apps/game-server/src/buildings/buildings.service.ts and is exposed
  // as POST /api/buildings/start-construction on game-server. It
  // enforces resource cost (canAfford + atomic deduct), per-base
  // building slot rules, queue cap, and tech prereqs.
  //
  // The FE has never POSTed to /api/v1/buildings (grep apps/web/src),
  // so removing the route is a no-op for clients. Same removal pattern
  // as the cycle-2 building-upgrade shim deletion (see note below).
  //
  // If you re-introduce a construction endpoint here, proxy to the
  // game-server's BuildingsService.startConstruction() — do not
  // reimplement a bare repo.create()/save() ever again.

  @Get()
  @ApiOperation({ summary: 'List buildings in a game' })
  @ApiQuery({ name: 'gameId', type: String })
  findAll(@Request() req: any, @Query('gameId', ParseUUIDPipe) gameId: string) {
    return this.buildingService.findByGame(gameId, req.user.id);
  }

  // NB. PATCH /buildings/:id/upgrade USED TO LIVE HERE — a legacy
  // shim from an earlier api-owned scheme. It had no max-level guard,
  // no resource cost, no queue: a live audit showed Lv 68 in 36 seconds
  // by hitting it 68 times. The FE never used this path (it calls the
  // game-server's POST /buildings/:id/upgrade which IS gated), so
  // removing the route closes the exploit without breaking any client.
  //
  // If you re-introduce a building upgrade here, mirror the
  // game-server's `buildings.service.ts:upgradeBuilding()` constraints
  // (MAX_BUILDING_LEVEL = 54, scaled cost, queue) — don't ship a bare
  // `level += 1; save()` ever again.

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Demolish a building' })
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.buildingService.remove(id, req.user.id);
  }
}
