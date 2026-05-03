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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PvpShieldService } from './pvp-shield.service';
import { MatchmakingService } from './matchmaking.service';
import { ComebackBonusService } from './comeback-bonus.service';
import { FindMatchDto } from './dto/find-match.dto';
import { RecordResultDto } from './dto/record-result.dto';
import { CreateBotProfileDto } from './dto/create-bot-profile.dto';
import { BotDifficulty } from './entities/pvp-bot-profile.entity';

@ApiTags('pvp-protection')
@Controller('api/v1/pvp')
export class PvpProtectionController {
  constructor(
    private readonly shieldService: PvpShieldService,
    private readonly matchmakingService: MatchmakingService,
    private readonly comebackBonusService: ComebackBonusService,
  ) {}

  // ─── Shield ────────────────────────────────────────────────────────────────

  @Post('shield/:playerId/init')
  @ApiOperation({ summary: 'Initialize 7-day PvP shield for a new player' })
  @ApiResponse({ status: 201, description: 'Shield initialized' })
  initShield(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.shieldService.initShield(playerId);
  }

  @Get('shield/:playerId')
  @ApiOperation({ summary: 'Get PvP shield status for a player' })
  getShieldStatus(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.shieldService.getShieldStatus(playerId);
  }

  @Delete('shield/:playerId')
  @ApiOperation({ summary: 'Opt out of PvP shield (player chooses to attack)' })
  optOutShield(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.shieldService.optOut(playerId);
  }

  @Patch('shield/:playerId/human-only')
  @ApiOperation({ summary: 'Toggle human-only matchmaking preference' })
  @ApiQuery({ name: 'enabled', type: Boolean })
  setHumanOnly(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query('enabled', ParseBoolPipe) enabled: boolean,
  ) {
    return this.shieldService.setHumanOnlyMatchmaking(playerId, enabled);
  }

  // ─── Matchmaking ───────────────────────────────────────────────────────────

  @Post('matchmaking/find')
  @ApiOperation({ summary: 'Find PvP opponent (bot for first 5 matches, then real player)' })
  @ApiResponse({ status: 201, description: 'Opponent found — use returned opponentId and opponentUnits to create battle' })
  findMatch(@Body() dto: FindMatchDto) {
    return this.matchmakingService.findMatch(
      dto.attackerId,
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
  recordResult(@Body() dto: RecordResultDto) {
    return this.comebackBonusService.recordMatchResult({
      playerId: dto.playerId,
      battleId: dto.battleId,
      result: dto.result,
      isBotMatch: dto.isBotMatch,
      opponentId: dto.opponentId ?? null,
      playerPowerScore: dto.playerPowerScore,
    });
  }

  @Get('comeback-bonus/:playerId')
  @ApiOperation({ summary: 'Get pending comeback bonus for a player (if any)' })
  getPendingBonus(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.comebackBonusService.getPendingBonus(playerId);
  }

  @Post('comeback-bonus/:playerId/claim/:bonusId')
  @ApiOperation({ summary: 'Claim a pending comeback bonus' })
  claimBonus(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Param('bonusId', ParseUUIDPipe) bonusId: string,
  ) {
    return this.comebackBonusService.claimBonus(playerId, bonusId);
  }

  @Get('stats/:playerId')
  @ApiOperation({ summary: 'Get PvP stats for a player (wins, losses, streak)' })
  getPlayerStats(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.comebackBonusService.getPlayerStats(playerId);
  }
}
