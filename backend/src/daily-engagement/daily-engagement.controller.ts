import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StreakService } from './streak.service';
import { DailyQuestService } from './daily-quest.service';
import { StaminaService } from './stamina.service';
import { UpdateQuestProgressDto } from './dto/update-quest-progress.dto';
import { SpendStaminaDto } from './dto/spend-stamina.dto';

@ApiTags('daily-engagement')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/daily')
export class DailyEngagementController {
  constructor(
    private readonly streakService: StreakService,
    private readonly dailyQuestService: DailyQuestService,
    private readonly staminaService: StaminaService,
  ) {}

  // ─── Streak ───────────────────────────────────────────────────────────────

  @Post('login/:playerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record daily login and update streak',
    description:
      'Idempotent within a calendar day. Returns newStreakDay=false if called more than once today. ' +
      'Grace period allows skipping 1 day without breaking the streak (once per cycle).',
  })
  @ApiParam({ name: 'playerId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Login recorded' })
  recordLogin(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @CurrentUser('sub') jwtSub: string,
  ) {
    if (jwtSub !== playerId) {
      throw new ForbiddenException('Cannot record login for another player');
    }
    return this.streakService.recordLogin(playerId);
  }

  @Get('streak/:playerId')
  @ApiOperation({ summary: 'Get streak status and pending rewards for a player' })
  @ApiParam({ name: 'playerId', type: 'string', format: 'uuid' })
  getStreak(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.streakService.findByPlayer(playerId);
  }

  @Post('streak/:playerId/claim/:day')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim a streak day reward' })
  @ApiParam({ name: 'playerId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'day', type: 'number', description: 'Streak day number (e.g. 3 for day-3 reward)' })
  @ApiResponse({ status: 200, description: 'Reward claimed' })
  claimStreakReward(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Param('day') day: string,
    @CurrentUser('sub') jwtSub: string,
  ) {
    if (jwtSub !== playerId) {
      throw new ForbiddenException('Cannot claim reward for another player');
    }
    return this.streakService.claimReward(playerId, parseInt(day, 10));
  }

  // ─── Daily Quests ─────────────────────────────────────────────────────────

  @Get('quests/:playerId')
  @ApiOperation({
    summary: "Get today's daily quest set for a player",
    description: 'Auto-creates or resets the quest set if the date has changed.',
  })
  @ApiParam({ name: 'playerId', type: 'string', format: 'uuid' })
  getQuests(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.dailyQuestService.getOrCreateProfile(playerId);
  }

  @Post('quests/:playerId/progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Increment progress on a daily quest',
    description: 'Completes the quest automatically when progress reaches the requirement.',
  })
  @ApiParam({ name: 'playerId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  updateProgress(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: UpdateQuestProgressDto,
    @CurrentUser('sub') jwtSub: string,
  ) {
    if (jwtSub !== playerId) {
      throw new ForbiddenException('Cannot update progress for another player');
    }
    return this.dailyQuestService.updateProgress(playerId, dto);
  }

  @Post('quests/:playerId/claim-bonus')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Claim the daily bonus chest (requires all quests completed)',
  })
  @ApiParam({ name: 'playerId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Bonus chest claimed' })
  claimBonusChest(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @CurrentUser('sub') jwtSub: string,
  ) {
    if (jwtSub !== playerId) {
      throw new ForbiddenException('Cannot claim bonus chest for another player');
    }
    return this.dailyQuestService.claimBonusChest(playerId);
  }

  // ─── Stamina ──────────────────────────────────────────────────────────────

  @Get('stamina/:playerId')
  @ApiOperation({
    summary: 'Get current stamina for a player',
    description:
      'Computes live regeneration without persisting. Max 10 stamina, regen 1 point per 30 minutes.',
  })
  @ApiParam({ name: 'playerId', type: 'string', format: 'uuid' })
  getStamina(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.staminaService.getStamina(playerId);
  }

  @Post('stamina/:playerId/spend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Spend stamina for a battle action' })
  @ApiParam({ name: 'playerId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Stamina spent' })
  spendStamina(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: SpendStaminaDto,
    @CurrentUser('sub') jwtSub: string,
  ) {
    if (jwtSub !== playerId) {
      throw new ForbiddenException('Cannot spend stamina for another player');
    }
    return this.staminaService.spend(playerId, dto.amount);
  }
}
