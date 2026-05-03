import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ParseBoolPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, JwtPayload } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PvpShieldService } from './pvp-shield.service';
import { MatchmakingService } from './matchmaking.service';
import { ComebackBonusService } from './comeback-bonus.service';
import { FindMatchDto } from './dto/find-match.dto';
import { RecordResultDto } from './dto/record-result.dto';
import { CreateBotProfileDto } from './dto/create-bot-profile.dto';
import { BotDifficulty } from './entities/pvp-bot-profile.entity';

@ApiTags('pvp-protection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/pvp')
export class PvpProtectionController {
  constructor(
    private readonly shieldService: PvpShieldService,
    private readonly matchmakingService: MatchmakingService,
    private readonly comebackBonusService: ComebackBonusService,
  ) {}

  // ─── Shield ────────────────────────────────────────────────────────────────

  @Post('shield/init')
  @ApiOperation({ summary: 'Initialize 7-day PvP shield for the authenticated player' })
  @ApiResponse({ status: 201, description: 'Shield initialized' })
  initShield(@CurrentUser() user: JwtPayload) {
    return this.shieldService.initShield(user.sub);
  }

  @Get('shield')
  @ApiOperation({ summary: 'Get PvP shield status for the authenticated player' })
  getShieldStatus(@CurrentUser() user: JwtPayload) {
    return this.shieldService.getShieldStatus(user.sub);
  }

  @Delete('shield')
  @ApiOperation({ summary: 'Opt out of PvP shield (player chooses to attack real opponents)' })
  optOutShield(@CurrentUser() user: JwtPayload) {
    return this.shieldService.optOut(user.sub);
  }

  @Patch('shield/human-only')
  @ApiOperation({ summary: 'Toggle human-only matchmaking preference' })
  @ApiQuery({ name: 'enabled', type: Boolean })
  setHumanOnly(
    @CurrentUser() user: JwtPayload,
    @Query('enabled', ParseBoolPipe) enabled: boolean,
  ) {
    return this.shieldService.setHumanOnlyMatchmaking(user.sub, enabled);
  }

  // ─── Matchmaking ───────────────────────────────────────────────────────────

  @Post('matchmaking/find')
  @ApiOperation({ summary: 'Find PvP opponent (bot for first 5 matches, then real player)' })
  @ApiResponse({ status: 201, description: 'Opponent found — use returned opponentId and opponentUnits to create battle' })
  findMatch(
    @CurrentUser() user: JwtPayload,
    @Body() dto: FindMatchDto,
  ) {
    // attackerId is always sourced from the validated JWT, never from the request body
    return this.matchmakingService.findMatch(
      user.sub,
      dto.attackerUnits,
      dto.candidateDefenderIds ?? [],
    );
  }

  @Get('matchmaking/bots')
  @ApiOperation({ summary: 'List active bot profiles' })
  getBotProfiles() {
    return this.matchmakingService.getActiveBotProfiles();
  }

  @Post('matchmaking/bots')
  @ApiOperation({ summary: 'Create a bot profile for the matchmaking pool' })
  createBotProfile(@Body() dto: CreateBotProfileDto) {
    return this.matchmakingService.createBotProfile(
      dto.name,
      dto.race,
      dto.units,
      dto.difficulty ?? BotDifficulty.MEDIUM,
    );
  }

  @Delete('matchmaking/bots/:id')
  @ApiOperation({ summary: 'Deactivate a bot profile' })
  deactivateBot(@Param('id', ParseUUIDPipe) id: string) {
    return this.matchmakingService.deactivateBotProfile(id);
  }

  // ─── Match records & comeback bonus ───────────────────────────────────────

  @Post('match-record')
  @ApiOperation({ summary: 'Record PvP match result and check for comeback bonus trigger' })
  @ApiResponse({ status: 201, description: 'Result recorded; comebackBonus is set if 3-loss streak triggered' })
  recordResult(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordResultDto,
  ) {
    // playerId is always sourced from the validated JWT
    return this.comebackBonusService.recordMatchResult({
      playerId: user.sub,
      battleId: dto.battleId,
      result: dto.result,
      isBotMatch: dto.isBotMatch,
      opponentId: dto.opponentId ?? null,
      playerPowerScore: dto.playerPowerScore,
    });
  }

  @Get('comeback-bonus')
  @ApiOperation({ summary: 'Get pending comeback bonus for the authenticated player (if any)' })
  getPendingBonus(@CurrentUser() user: JwtPayload) {
    return this.comebackBonusService.getPendingBonus(user.sub);
  }

  @Post('comeback-bonus/claim/:bonusId')
  @ApiOperation({ summary: 'Claim a pending comeback bonus' })
  claimBonus(
    @CurrentUser() user: JwtPayload,
    @Param('bonusId', ParseUUIDPipe) bonusId: string,
  ) {
    return this.comebackBonusService.claimBonus(user.sub, bonusId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get PvP stats for the authenticated player (wins, losses, streak)' })
  getPlayerStats(@CurrentUser() user: JwtPayload) {
    return this.comebackBonusService.getPlayerStats(user.sub);
  }
}
