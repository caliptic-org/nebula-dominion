import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { EraProgressionService } from './era-progression.service';
import { TriggerEraTransitionDto } from './dto/trigger-transition.dto';
import { UpdateQuestProgressDto } from './dto/update-quest-progress.dto';

@Controller('era-progression')
export class EraProgressionController {
  constructor(private readonly service: EraProgressionService) {}

  // GET /era-progression/:playerId/status
  @Get(':playerId/status')
  async getStatus(@Param('playerId', ParseUUIDPipe) playerId: string) {
    const progress = await this.service.getOrCreateProgress(playerId);
    const boostInfo = await this.service.getActiveProductionBoostMultiplier(playerId);
    return { progress, boost: boostInfo };
  }

  // GET /era-progression/:playerId/transition-eligibility
  @Get(':playerId/transition-eligibility')
  async getTransitionEligibility(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query('minerals') minerals: string,
    @Query('gas') gas: string,
  ) {
    const progress = await this.service.getOrCreateProgress(playerId);
    return this.service.checkTransitionEligibility(
      progress.currentEra,
      parseInt(minerals, 10) || 0,
      parseInt(gas, 10) || 0,
    );
  }

  // POST /era-progression/:playerId/transition
  @Post(':playerId/transition')
  async triggerTransition(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: TriggerEraTransitionDto,
  ) {
    return this.service.triggerEraTransition(playerId, dto);
  }

  // GET /era-progression/:playerId/catchup-package
  @Get(':playerId/catchup-package')
  async getCatchupPackage(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.service.getActiveCatchupPackage(playerId);
  }

  // POST /era-progression/:playerId/catchup-package/:packageId/claim-unit
  @Post(':playerId/catchup-package/:packageId/claim-unit')
  async claimFreeUnit(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Param('packageId', ParseUUIDPipe) packageId: string,
  ) {
    return this.service.claimFreeUnit(playerId, packageId);
  }

  // GET /era-progression/:playerId/production-boost
  @Get(':playerId/production-boost')
  async getProductionBoost(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.service.getActiveProductionBoostMultiplier(playerId);
  }

  // GET /era-progression/:playerId/quests
  @Get(':playerId/quests')
  async getActiveQuests(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.service.getActiveQuests(playerId);
  }

  // POST /era-progression/:playerId/quests/:questId/progress
  @Post(':playerId/quests/:questId/progress')
  async updateQuestProgress(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Param('questId', ParseUUIDPipe) questId: string,
    @Body() dto: UpdateQuestProgressDto,
  ) {
    return this.service.updateQuestProgress(playerId, questId, dto.increment);
  }

  // GET /era-progression/:playerId/mechanics
  @Get(':playerId/mechanics')
  async getProgressiveMechanics(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.service.getProgressiveMechanics(playerId);
  }

  // POST /era-progression/:playerId/mechanics/:mechanicCode/first-use
  @Post(':playerId/mechanics/:mechanicCode/first-use')
  async recordMechanicFirstUse(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Param('mechanicCode') mechanicCode: string,
  ) {
    return this.service.recordMechanicFirstUse(playerId, mechanicCode);
  }

  // GET /era-progression/champions/:allianceId
  @Get('champions/:allianceId')
  async getRecentChampions(@Param('allianceId', ParseUUIDPipe) allianceId: string) {
    return this.service.getRecentChampions(allianceId);
  }
}
