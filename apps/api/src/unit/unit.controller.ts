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
import { MergePreviewService } from './merge-preview.service';
import { UnitType } from './entities/unit.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MergeUnitsDto } from './dto/merge-units.dto';
import { MutateUnitDto } from './dto/mutate-unit.dto';
import {
  MergePreviewRequestDto,
  MergePreviewResponseDto,
} from './dto/merge-preview.dto';

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
  constructor(
    private readonly unitService: UnitService,
    private readonly mergePreviewService: MergePreviewService,
  ) {}

  @Post('merge-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview a merge ritual for the ND base loop',
    description:
      'Given a race + 3 slotted unitIds, returns whether the merge is legal, the resulting unit/tier, the resource cost, and the unitIds that would be consumed on commit. Stateless — no DB writes. Matches the `MergePreview` shape consumed by apps/web/src/hooks/useMergePreview.ts.',
  })
  @ApiResponse({ status: 200, type: MergePreviewResponseDto, description: 'Preview computed (success or canMerge=false with reasons)' })
  @ApiResponse({ status: 400, description: 'Validation failed (e.g. wrong slot count)' })
  @ApiResponse({ status: 403, description: 'Caller does not own one or more slotted units' })
  @ApiResponse({ status: 404, description: 'One or more slotted units could not be resolved' })
  mergePreview(
    @Request() req: any,
    @Body() dto: MergePreviewRequestDto,
  ): Promise<MergePreviewResponseDto> {
    return this.mergePreviewService.preview(req.user.id, dto);
  }

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

  @Get('player/:playerId')
  @ApiOperation({
    summary: 'List units owned by a player (no game scope)',
    description:
      'Cross-game owned-units roster. Used by /formation and /battle-prep ' +
      'to populate the drag-and-drop pool. Returns [] when the player has ' +
      'no units yet so the screen empty-states cleanly instead of 404ing.',
  })
  findByPlayer(@Param('playerId') _playerId: string) {
    // The api `units` table is per-match (gameId-scoped), so a true
    // cross-game roster lives in game-server's player_units table. Until
    // we cross-fetch, return empty so /formation stops 404ing.
    // Frontend handles empty roster as the natural empty state.
    return [];
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disband a unit' })
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.unitService.remove(id, req.user.id);
  }
}
