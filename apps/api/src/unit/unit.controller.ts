import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitService, CreateUnitDto } from './unit.service';
import { UnitType } from './entities/unit.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MergeUnitsDto } from './dto/merge-units.dto';
import { MutateUnitDto } from './dto/mutate-unit.dto';

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

  @Post('produce')
  @ApiOperation({ summary: 'Alias of POST /units — produce a unit (mvp.txt contract)' })
  produce(@Request() req: any, @Body() dto: CreateUnitBodyDto) {
    return this.unitService.create(req.user.id, dto);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge two same-type, same-level units into a higher-level unit' })
  @ApiResponse({ status: 400, description: 'Units cannot be merged' })
  merge(@Request() req: any, @Body() dto: MergeUnitsDto) {
    return this.unitService.merge(req.user.id, dto);
  }

  @Post('mutate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mutate a unit (Zerg-only mechanic)' })
  @ApiResponse({ status: 403, description: 'Mutation is a Zerg-only mechanic' })
  mutate(@Request() req: any, @Body() dto: MutateUnitDto) {
    return this.unitService.mutate(req.user.id, dto);
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
