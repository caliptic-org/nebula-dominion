import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ResearchService } from './research.service';
import {
  TechTreeQueryDto,
  NodeDetailQueryDto,
  StartResearchDto,
  CancelResearchDto,
  QueueQueryDto,
  ProgressQueryDto,
} from './dto/research.dto';
import { ResearchCategory } from './types/research.types';

@ApiTags('research')
@Controller('api/v1/research')
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Get('tech-tree')
  @ApiOperation({ summary: 'Get tech tree nodes for a race and optional category' })
  @ApiResponse({ status: 200, description: 'List of tech nodes with player state' })
  @ApiQuery({ name: 'playerId', required: true })
  @ApiQuery({ name: 'race', required: true })
  @ApiQuery({ name: 'category', required: false, enum: ResearchCategory })
  getTechTree(
    @Query('playerId', ParseUUIDPipe) playerId: string,
    @Query('race') race: string,
    @Query('category') category?: ResearchCategory,
  ) {
    return this.researchService.getTechTree(playerId, race, category);
  }

  @Get('nodes/:nodeKey')
  @ApiOperation({ summary: 'Get a single tech node detail with player state' })
  @ApiParam({ name: 'nodeKey', description: 'Tech node key (e.g., ek-madencilik)' })
  @ApiQuery({ name: 'playerId', required: true })
  getNode(
    @Param('nodeKey') nodeKey: string,
    @Query('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.researchService.getNode(nodeKey, playerId);
  }

  @Post('start')
  @ApiOperation({ summary: 'Start researching a tech node' })
  @ApiResponse({ status: 201, description: 'Research started' })
  @ApiResponse({ status: 400, description: 'Prerequisites not met' })
  @ApiResponse({ status: 409, description: 'Research already active or node already completed' })
  startResearch(@Body() dto: StartResearchDto) {
    return this.researchService.startResearch(dto.playerId, dto.nodeKey);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel an active research' })
  @ApiResponse({ status: 200, description: 'Research cancelled' })
  @ApiResponse({ status: 404, description: 'No active research found for this node' })
  cancelResearch(@Body() dto: CancelResearchDto) {
    return this.researchService.cancelResearch(dto.playerId, dto.nodeKey);
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get current research queue for a player' })
  @ApiQuery({ name: 'playerId', required: true })
  getQueue(@Query('playerId', ParseUUIDPipe) playerId: string) {
    return this.researchService.getQueue(playerId);
  }

  @Get('progress/:nodeKey')
  @ApiOperation({ summary: 'Get research progress for a specific node' })
  @ApiParam({ name: 'nodeKey', description: 'Tech node key' })
  @ApiQuery({ name: 'playerId', required: true })
  getProgress(
    @Param('nodeKey') nodeKey: string,
    @Query('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.researchService.getProgress(nodeKey, playerId);
  }
}
