import { Controller, Get, Post, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { VipService } from './vip.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('VIP')
// Path is just 'vip' — NestJS adds the global 'api/v1' prefix in main.ts.
// Earlier value 'api/v1/vip' double-prefixed to /api/v1/api/v1/vip, which
// 404'd every call. Surfaced by autonomous browser playtest run-4 once the
// frontend stopped passing the same redundant prefix from its end.
@Controller('vip')
export class VipController {
  constructor(private readonly vipService: VipService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcının VIP durumu ve kümülatif harcaması' })
  async getMyVipStatus(@Request() req: { user: { id: string } }) {
    // Wire-format mapper: FE useVip.ts (VipStatusWire) expects snake_case
    // (vip_level, current_xp, next_level_xp, daily_claimed_at) but the
    // service returns camelCase + a "spend" model instead of "xp". The
    // mismatch silently broke every VIP progress bar (currentXp ended
    // up undefined → bar always showed 0). Map service shape →
    // FE-visible shape here so the contract is locally explicit.
    //
    // - vip_level         ← vipLevel
    // - current_xp        ← cumulativeSpendUsd (USD spend doubles as XP
    //                      until a dedicated VIP XP system ships)
    // - next_level_xp     ← nextTierSpendUsd ?? cumulativeSpendUsd (cap
    //                      when maxed so the bar reads as 100% full)
    // - expiry_date       ← null (VIP has no expiry concept in this
    //                      spend-tracked model; the field is kept so the
    //                      FE shape stays stable for a future
    //                      subscription-style VIP).
    // - is_active         ← vipLevel > 0
    // - daily_claimed_at  ← lastDailyClaimAt (own query — getVipStatus
    //                      doesn't expose it directly)
    const status = await this.vipService.getVipStatus(req.user.id);
    const dailyClaimedAt = await this.vipService.getLastDailyClaimAt(
      req.user.id,
    );
    return {
      vip_level:        status.vipLevel,
      current_xp:       status.cumulativeSpendUsd,
      next_level_xp:    status.nextTierSpendUsd ?? status.cumulativeSpendUsd,
      expiry_date:      null,
      is_active:        status.vipLevel > 0,
      daily_claimed_at: dailyClaimedAt ? dailyClaimedAt.toISOString() : null,
    };
  }

  @Get('tiers')
  @ApiOperation({ summary: 'Tüm VIP kademeleri, eşikler ve faydalar' })
  getAllTiers() {
    return this.vipService.getAllTiers();
  }

  @Get('tiers/:level')
  @ApiOperation({ summary: 'Belirli bir VIP kademesinin faydaları' })
  @ApiParam({ name: 'level', type: Number, description: 'VIP seviyesi (0-10)' })
  getTierBenefits(@Param('level', ParseIntPipe) level: number) {
    return this.vipService.getTierBenefits(level);
  }

  @Get('analytics/arppu-cohorts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'VIP kademesi bazında ARPPU cohort analizi' })
  getArppuCohorts() {
    return this.vipService.getArppuCohorts();
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcı satın alma geçmişi (telemetri)' })
  getPurchaseHistory(@Request() req: { user: { id: string } }) {
    return this.vipService.getUserPurchaseHistory(req.user.id);
  }

  /**
   * Once-per-day VIP reward.  Free for all players (even Standard tier
   * 0) — reward size scales with VIP level so paid tiers see a clear
   * benefit.  20-hour cooldown to keep the claim window floating with
   * local play time.  Maps to the FE's claimDailyVip() in useVip.ts.
   */
  @Post('claim-daily')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Günlük VIP ödülünü al (20 saat cooldown)' })
  async claimDaily(@Request() req: { user: { id: string } }) {
    const result = await this.vipService.claimDaily(req.user.id);
    // Wire shape matches ClaimDailyWire in apps/web/src/hooks/useVip.ts —
    // snake_case for already_claimed + next_claim_at because the FE mapper
    // expects those keys directly.
    return {
      rewards: result.rewards,
      already_claimed: result.alreadyClaimed,
      next_claim_at: result.nextClaimAt,
    };
  }
}
