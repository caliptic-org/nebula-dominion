import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PremiumService } from './premium.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InternalServiceGuard } from '../quest-progress/guards/internal-service.guard';
import { ServerBattlePassXpDto } from './dto/battle-pass-xp.dto';

@ApiTags('Premium')
// Global prefix `api/v1` lives in main.ts — declaring it here too made the
// real mount /api/v1/api/v1/premium/* which 404'd every FE call. Drop it.
@Controller('premium')
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Get('passes')
  @ApiOperation({ summary: 'Mevcut premium passları listele' })
  getPasses() {
    return this.premiumService.getAvailablePasses();
  }

  @Get('passes/:code')
  @ApiOperation({ summary: 'Premium pass detayı' })
  @ApiParam({ name: 'code', description: 'Pass kodu (örn: monthly_pass)' })
  getPass(@Param('code') code: string) {
    return this.premiumService.getPassByCode(code);
  }

  @Get('status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kullanıcının premium durumu' })
  getStatus(@CurrentUser() currentUserId: string) {
    return this.premiumService.checkPremiumStatus(currentUserId);
  }

  @Get('my-passes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kullanıcının aktif passları' })
  getMyPasses(@CurrentUser() currentUserId: string) {
    return this.premiumService.getUserActivePasses(currentUserId);
  }

  /**
   * Battle-pass XP grant — INTERNAL-ONLY.
   *
   * Wires the audit fix (BLOCKER F1) for this endpoint. The previous
   * shape (`@CurrentUser() + body.xpAmount`) let any logged-in player
   * POST `{ xpAmount: 50000 }` and jump tier 1 → 50 in a single call
   * (XP_PER_TIER=1000, max tier 50). No FE caller exists today
   * (grepped apps/web — 0 hits for `/premium/battle-pass/xp`); the
   * legitimate caller is game-server after a battle / quest / boss
   * event resolves.
   *
   * The route is now gated behind `InternalServiceGuard` (the same
   * shared-secret guard `/quest-progress/increment` uses; CLAUDE.md
   * §1 — cross-service JWT_SECRET). game-server is expected to send
   * the `X-Internal-Service: Bearer <secret>` header. JwtAuthGuard
   * is intentionally NOT applied — the userId travels in the body
   * (set by game-server which knows the canonical player id).
   *
   * If we ever expose a player-facing XP grant (we shouldn't), it
   * needs to live on a separate route with the amount derived from
   * a fixed per-source schedule, never trusted from the body.
   */
  @Post('battle-pass/xp')
  @UseGuards(InternalServiceGuard)
  @ApiOperation({
    summary:
      'Battle pass XP ekle (game-server → api, internal). ' +
      'X-Internal-Service header zorunlu. Idempotent on (userId, referenceId); ' +
      'per-call clamp [0, 1000]; per-user daily cap 2000.',
  })
  addBattlePassXp(@Body() dto: ServerBattlePassXpDto) {
    return this.premiumService.addBattlePassXp(
      dto.userId,
      dto.xpAmount,
      dto.source,
      dto.referenceId,
    );
  }

  @Post('passes/:userPassId/claim-tier/:tier')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Battle pass tier ödülü al' })
  @ApiParam({ name: 'userPassId', description: 'Kullanıcı pass ID' })
  @ApiParam({ name: 'tier', description: 'Tier numarası (1-50)' })
  claimTierReward(
    @CurrentUser() currentUserId: string,
    @Param('userPassId') userPassId: string,
    @Param('tier', ParseIntPipe) tier: number,
  ) {
    return this.premiumService.claimTierReward(currentUserId, userPassId, tier);
  }

  @Patch('passes/:userPassId/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Premium pass iptal et' })
  @ApiParam({ name: 'userPassId', description: 'Kullanıcı pass ID' })
  cancelPass(@CurrentUser() currentUserId: string, @Param('userPassId') userPassId: string) {
    return this.premiumService.cancelPass(currentUserId, userPassId);
  }
}
