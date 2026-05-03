import { Controller, Get, Post, Patch, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { GameStateService } from './game-state.service';
import { SelectRaceDto } from './dto/select-race.dto';
import { CollectResourcesDto } from './dto/collect-resources.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('game-state')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'game-state', version: '1' })
export class GameStateController {
  constructor(private readonly gameStateService: GameStateService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get game state for a player' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Game state returned' })
  @ApiResponse({ status: 403, description: 'Forbidden — can only view own state' })
  getState(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.gameStateService.getState(user.sub, userId);
  }

  @Post(':userId/race')
  @ApiOperation({ summary: 'Select race (once, before level 2)' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Race selected' })
  @ApiResponse({ status: 400, description: 'Race already locked (level > 1)' })
  selectRace(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SelectRaceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.gameStateService.selectRace(user.sub, userId, dto);
  }

  @Patch(':userId/resources')
  @ApiOperation({ summary: 'Add collected resources to game state' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Resources updated' })
  collectResources(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CollectResourcesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.gameStateService.collectResources(user.sub, userId, dto);
  }

  @Get('summary/admin')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Aggregate game state stats (internal)' })
  @ApiResponse({ status: 200, description: 'Summary stats' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  adminSummary() {
    return this.gameStateService.adminSummary();
  }
}
