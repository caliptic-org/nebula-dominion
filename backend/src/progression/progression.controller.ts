import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProgressionService } from './progression.service';

@Controller('progression')
export class ProgressionController {
  constructor(private readonly svc: ProgressionService) {}

  @Get('player/:playerId')
  getProgression(@Param('playerId') playerId: string) {
    return this.svc.getProgression(playerId);
  }

  @Get('player/:playerId/breakdown')
  getBreakdown(
    @Param('playerId') playerId: string,
    @Query('since') since?: string,
  ) {
    return this.svc.getXpBreakdown(playerId, since ? new Date(since) : undefined);
  }

  @Post('player/:playerId/award')
  @HttpCode(HttpStatus.OK)
  awardXp(
    @Param('playerId') playerId: string,
    @Body() body: { sourceType: string; amount: number; sessionId?: string },
  ) {
    return this.svc.awardXp(playerId, body.sourceType, body.amount, body.sessionId);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Get('thresholds')
  getThresholds() {
    return this.svc.getThresholdTable();
  }

  @Get('weights')
  getWeights(@Query('age') age?: string) {
    return this.svc.getSourceWeights(age ? parseInt(age, 10) : 1);
  }

  @Patch('weights/:sourceType')
  updateWeight(
    @Param('sourceType') sourceType: string,
    @Body() body: { weightPct: number },
  ) {
    return this.svc.updateSourceWeight(sourceType, body.weightPct);
  }

  @Post('thresholds/reload')
  @HttpCode(HttpStatus.OK)
  reloadThresholds() {
    return this.svc.reloadThresholds();
  }
}
