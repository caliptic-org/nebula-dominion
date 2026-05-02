import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, Request, Query } from '@nestjs/common';
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

  @Patch(':id/upgrade')
  @ApiOperation({ summary: 'Upgrade a building level' })
  upgrade(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.buildingService.upgrade(id, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Demolish a building' })
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.buildingService.remove(id, req.user.id);
  }
}
