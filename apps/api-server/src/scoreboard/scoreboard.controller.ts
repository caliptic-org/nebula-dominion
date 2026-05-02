import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ScoreboardService } from './scoreboard.service';
import { ScoreboardQueryDto } from './dto/scoreboard-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('scoreboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'scoreboard', version: '1' })
export class ScoreboardController {
  constructor(private readonly scoreboardService: ScoreboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated leaderboard ordered by total score' })
  @ApiResponse({ status: 200, description: 'Scoreboard page returned' })
  getLeaderboard(@Query() query: ScoreboardQueryDto) {
    return this.scoreboardService.getLeaderboard(query);
  }

  @Get('top-elo')
  @ApiOperation({ summary: 'Get top N players by ELO rating' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max 100' })
  @ApiResponse({ status: 200, description: 'Top ELO players returned' })
  getTopElo(@Query('limit') limit?: number) {
    return this.scoreboardService.getTopByElo(limit);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get ranking and stats for a specific player' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Player rank returned' })
  @ApiResponse({ status: 404, description: 'Player not found in scoreboard' })
  getPlayerRank(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.scoreboardService.getPlayerRank(userId);
  }
}
