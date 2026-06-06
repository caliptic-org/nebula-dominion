import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BuildingService, CreateBuildingDto } from './building.service';
import { BuildingType } from './entities/building.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateBuildingBodyDto implements CreateBuildingDto {
  @ApiProperty()
  @IsUUID()
  gameId: string;

  @ApiProperty({ enum: BuildingType })
  @IsEnum(BuildingType)
  type: BuildingType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  position?: { x: number; y: number };
}

@ApiTags('buildings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('buildings')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Post()
  @ApiOperation({ summary: 'Construct a building' })
  create(@Request() req: any, @Body() dto: CreateBuildingBodyDto) {
    return this.buildingService.create(req.user.id, dto);
  }

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
