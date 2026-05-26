import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DailyEngagementService } from './daily-engagement.service';
import { ClaimMissionDto } from './dto/claim-mission.dto';

/**
 * Canonical persistence + wallet wire-up for story / weekly / achievement /
 * daily mission claims.
 *
 * NOTE: Controller path is just `daily-engagement` — Nest already applies
 * the global `api/v1` prefix in main.ts, so the wire URL is
 *   /api/v1/daily-engagement/{claims,claim}
 *
 * Adding `api/v1` here would produce the classic double-prefix bug
 * (/api/v1/api/v1/...). Don't.
 */
@ApiTags('Daily Engagement')
@Controller('daily-engagement')
export class DailyEngagementController {
  constructor(private readonly service: DailyEngagementService) {}

  @Get('claims')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List the caller's persisted mission claims",
    description:
      'Used by the missions screen to hydrate the "claimed" badge state ' +
      'for story / weekly / achievement / daily missions in a single GET.',
  })
  listClaims(@Request() req: { user: { id: string } }) {
    return this.service.listClaims(req.user.id);
  }

  @Post('claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Claim a mission reward',
    description:
      "Persists a (userId, missionId) row and fans the reward out to " +
      "game-server's wallet endpoint. Idempotent: re-posting the same " +
      'missionId returns `alreadyClaimed: true` without re-crediting.',
  })
  claim(
    @Request() req: { user: { id: string } },
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: ClaimMissionDto,
  ) {
    return this.service.claim({
      userId: req.user.id,
      missionId: dto.missionId,
      missionType: dto.missionType,
      reward: dto.reward ?? {},
      authorization,
    });
  }
}
