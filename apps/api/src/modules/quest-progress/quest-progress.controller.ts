import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { QuestProgressService } from './quest-progress.service';
import { ServerIncrementProgressDto } from './dto/server-increment.dto';
import { InternalServiceGuard } from './guards/internal-service.guard';

/**
 * Quest progress endpoints.
 *
 * Path is bound to `quest-progress` only — NestJS prepends the global
 * `api/v1` prefix in main.ts, so the live URLs are:
 *   POST /api/v1/quest-progress/increment
 *   GET  /api/v1/quest-progress/:userId
 *
 * Auth:
 *   - `increment` is intentionally PUBLIC for now. game-server fires it
 *     fire-and-forget after a battle ends or a building completes;
 *     wrapping it in JWT today would force game-server to manage api
 *     credentials with no security benefit (game-server is already
 *     trusted upstream). When an internal-service shared secret guard
 *     lands, plug it in here as `@UseGuards(InternalServiceGuard)` —
 *     the wire contract stays identical.
 *   - `getForUser` is also unauthenticated; the data is non-sensitive
 *     and matches the existing pattern in the missions stub
 *     (`/api/v1/daily/quests/:playerId`).
 */
@ApiTags('quest-progress')
@Controller('quest-progress')
export class QuestProgressController {
  private readonly logger = new Logger(QuestProgressController.name);

  constructor(private readonly svc: QuestProgressService) {}

  @Post('increment')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalServiceGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Bump a quest counter for a user. Idempotent on (userId, questId, idempotencyKey). ' +
      'Requires the X-Internal-Service header (game-server only).',
  })
  async increment(@Body() dto: ServerIncrementProgressDto) {
    const amount = dto.amount ?? 1;
    return this.svc.incrementProgress(dto.userId, dto.questId, amount, dto.idempotencyKey);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'All quest counters for a single user.' })
  async getForUser(@Param('userId') userId: string) {
    const progress = await this.svc.getAllProgress(userId);
    return { userId, progress };
  }
}
