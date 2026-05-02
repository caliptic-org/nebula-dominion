import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitService, CreateUnitDto } from './unit.service';
import { UnitType } from './entities/unit.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateUnitBodyDto implements CreateUnitDto {
  @ApiProperty()
  @IsUUID()
  gameId: string;

  @ApiProperty({ enum: UnitType })
  @IsEnum(UnitType)
  type: UnitType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;
}

@ApiTags('units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Post()
  @ApiOperation({ summary: 'Train a unit' })
  create(@Request() req: any, @Body() dto: CreateUnitBodyDto) {
    return this.unitService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List units in a game' })
  @ApiQuery({ name: 'gameId', type: String })
  findAll(@Request() req: any, @Query('gameId', ParseUUIDPipe) gameId: string) {
    return this.unitService.findByGame(gameId, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disband a unit' })
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.unitService.remove(id, req.user.id);
  }
}
