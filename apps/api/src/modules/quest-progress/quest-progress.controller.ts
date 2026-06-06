import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { QuestProgressService } from './quest-progress.service';
import { ServerIncrementProgressDto } from './dto/server-increment.dto';
import { InternalServiceGuard } from './guards/internal-service.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Quest progress endpoints.
 *
 * Path is bound to `quest-progress` only — NestJS prepends the global
 * `api/v1` prefix in main.ts, so the live URLs are:
 *   POST /api/v1/quest-progress/increment
 *   GET  /api/v1/quest-progress/me           (preferred, JWT-scoped)
 *   GET  /api/v1/quest-progress/:userId      (deprecated alias; self only)
 *
 * Auth:
 *   - `increment` is gated on the `InternalServiceGuard` shared secret;
 *     only game-server can mint quest counter bumps.
 *   - `getForMe` and `getForUser` both require a valid user JWT.
 *
 * Security note (IDOR-QUEST-PROGRESS-READ-04, audit cycle 6):
 *   Previously `GET /quest-progress/:userId` had no guard at all. Any
 *   anonymous caller could enumerate `battles_won`, `buildings_built`,
 *   `pve_won` etc. for any user UUID — letting attackers profile which
 *   accounts were active and time PvP raid windows against them. The
 *   "data is non-sensitive" rationale that previously sat here was
 *   wrong: counter deltas leak login + activity cadence. The path
 *   variant is kept as a deprecated alias so stale FE callers don't
 *   break, but it 403s whenever path userId !== JWT subject.
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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'All quest counters for the calling user (JWT-scoped).' })
  async getForMe(@Request() req: ExpressRequest & { user: { id: string } }) {
    const userId = req.user.id;
    const progress = await this.svc.getAllProgress(userId);
    return { userId, progress };
  }

  /**
   * Deprecated path-param variant. Use `GET /quest-progress/me` instead.
   *
   * Kept temporarily so any FE build still wired to the legacy URL
   * keeps working for its own user. Enforces self-only access: requests
   * for someone else's userId are rejected with 403 even with a valid
   * JWT. This closes the IDOR-QUEST-PROGRESS-READ-04 hole without
   * forcing a coordinated FE/BE deploy.
   */
  @Get(':userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      '[Deprecated] All quest counters for a single user. ' +
      'Use GET /quest-progress/me. Self-only; 403 if path userId !== JWT subject.',
    deprecated: true,
  })
  async getForUser(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('userId') userId: string,
  ) {
    if (userId !== req.user.id) {
      throw new ForbiddenException('Cannot read another user’s quest progress.');
    }
    const progress = await this.svc.getAllProgress(userId);
    return { userId, progress };
  }
}
