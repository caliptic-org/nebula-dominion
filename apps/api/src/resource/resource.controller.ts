import { Controller, Get, Query, UseGuards, ParseUUIDPipe, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ResourceService } from './resource.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Get()
  @ApiOperation({ summary: 'List resources in a game' })
  @ApiQuery({ name: 'gameId', type: String })
  findAll(@Request() req: any, @Query('gameId', ParseUUIDPipe) gameId: string) {
    return this.resourceService.findByGame(gameId, req.user.id);
  }
}
