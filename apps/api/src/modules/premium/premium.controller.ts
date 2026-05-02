import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PremiumService } from './premium.service';

@ApiTags('Premium')
@ApiBearerAuth()
@Controller('api/v1/premium')
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
  @ApiOperation({ summary: 'Kullanıcının premium durumu' })
  getStatus() {
    const userId = 'demo-user-id';
    return this.premiumService.checkPremiumStatus(userId);
  }

  @Get('my-passes')
  @ApiOperation({ summary: 'Kullanıcının aktif passları' })
  getMyPasses() {
    const userId = 'demo-user-id';
    return this.premiumService.getUserActivePasses(userId);
  }

  @Post('battle-pass/xp')
  @ApiOperation({ summary: 'Battle pass XP ekle (oyun sunucusu çağrısı)' })
  addBattlePassXp(@Body() body: { xpAmount: number }) {
    const userId = 'demo-user-id';
    return this.premiumService.addBattlePassXp(userId, body.xpAmount);
  }

  @Post('passes/:userPassId/claim-tier/:tier')
  @ApiOperation({ summary: 'Battle pass tier ödülü al' })
  @ApiParam({ name: 'userPassId', description: 'Kullanıcı pass ID' })
  @ApiParam({ name: 'tier', description: 'Tier numarası (1-50)' })
  claimTierReward(
    @Param('userPassId') userPassId: string,
    @Param('tier', ParseIntPipe) tier: number,
  ) {
    const userId = 'demo-user-id';
    return this.premiumService.claimTierReward(userId, userPassId, tier);
  }

  @Patch('passes/:userPassId/cancel')
  @ApiOperation({ summary: 'Premium pass iptal et' })
  @ApiParam({ name: 'userPassId', description: 'Kullanıcı pass ID' })
  cancelPass(@Param('userPassId') userPassId: string) {
    const userId = 'demo-user-id';
    return this.premiumService.cancelPass(userId, userPassId);
  }
}
