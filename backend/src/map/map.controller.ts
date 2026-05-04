import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MapActionDto } from './dto/map-action.dto';
import { MapService } from './map.service';

@ApiTags('map')
@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('state')
  @ApiOperation({ summary: 'Get full map state: bases, resources, enemies, territories' })
  @ApiQuery({ name: 'playerRace', required: false, description: 'Player race (default: insan)' })
  @ApiResponse({ status: 200, description: 'Map state returned' })
  getMapState(@Query('playerRace') playerRace?: string) {
    return this.mapService.getMapState(playerRace);
  }

  @Get('player/resources')
  @ApiOperation({ summary: "Get player's current resource snapshot" })
  @ApiQuery({ name: 'playerId', required: true, description: 'Player UUID' })
  @ApiResponse({ status: 200, description: 'Resources returned' })
  @ApiResponse({ status: 401, description: 'playerId missing' })
  getPlayerResources(@Query('playerId') playerId: string) {
    return this.mapService.getPlayerResources(playerId);
  }

  @Post('map/action')
  @ApiOperation({ summary: 'Execute a map action (attack, gather, scout, etc.)' })
  @ApiResponse({ status: 201, description: 'Action accepted' })
  @ApiResponse({ status: 400, description: 'Invalid coordinates or action-target mismatch' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (10 actions/min)' })
  executeAction(@Body() dto: MapActionDto) {
    return this.mapService.executeAction(dto);
  }
}
