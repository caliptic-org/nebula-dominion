import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EventsService } from './events.service';
import { QueryEventsDto } from './dto/query-events.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { EventStatus } from './entities/event.entity';

@ApiTags('Events')
@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Etkinlik listesi' })
  @ApiQuery({ name: 'status', enum: EventStatus, required: false })
  findAll(@Query() query: QueryEventsDto) {
    return this.eventsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Etkinlik detayı' })
  @ApiParam({ name: 'id', description: 'Etkinlik UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }

  @Get(':id/leaderboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Canlı sıralama (auth gerekli)' })
  @ApiParam({ name: 'id', description: 'Etkinlik UUID' })
  getLeaderboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: LeaderboardQueryDto,
  ) {
    return this.eventsService.getLeaderboard(id, query);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Etkinliğe katıl (auth gerekli)' })
  @ApiParam({ name: 'id', description: 'Etkinlik UUID' })
  join(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.eventsService.join(id, req.user.sub);
  }

  @Get(':id/rewards')
  @ApiOperation({ summary: 'Ödül tablosu' })
  @ApiParam({ name: 'id', description: 'Etkinlik UUID' })
  getRewards(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getRewards(id);
  }
}
