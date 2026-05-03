import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { VipService } from './vip.service';

@Controller('vip')
export class VipController {
  constructor(private readonly svc: VipService) {}

  @Get('tiers')
  getTiers() {
    return this.svc.getAllTiers();
  }

  @Get('player/:playerId')
  getLedger(@Param('playerId') playerId: string) {
    return this.svc.getLedger(playerId);
  }

  @Get('player/:playerId/benefits')
  getBenefits(@Param('playerId') playerId: string) {
    return this.svc.getBenefits(playerId);
  }

  @Get('player/:playerId/arppu')
  getArppu(@Param('playerId') playerId: string, @Query('since') since?: string) {
    return this.svc.getArppu(playerId, since ? new Date(since) : undefined);
  }

  @Post('player/:playerId/purchase')
  @HttpCode(HttpStatus.OK)
  recordPurchase(
    @Param('playerId') playerId: string,
    @Body() body: { purchaseType: string; amountCents: number },
  ) {
    return this.svc.recordPurchase(playerId, body.purchaseType, body.amountCents);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Patch('tiers/:level/benefits')
  updateBenefits(
    @Param('level') level: string,
    @Body() body: { benefits: Record<string, unknown> },
  ) {
    return this.svc.updateTierBenefits(parseInt(level, 10), body.benefits);
  }

  @Post('tiers/reload')
  @HttpCode(HttpStatus.OK)
  reloadTiers() {
    return this.svc.reloadTiers();
  }
}
