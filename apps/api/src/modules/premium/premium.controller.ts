import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PremiumService } from './premium.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Premium')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  getStatus(@CurrentUser() currentUserId: string) {
    return this.premiumService.checkPremiumStatus(currentUserId);
  }

  @Get('my-passes')
  @ApiOperation({ summary: 'Kullanıcının aktif passları' })
  getMyPasses(@CurrentUser() currentUserId: string) {
    return this.premiumService.getUserActivePasses(currentUserId);
  }

  @Post('battle-pass/xp')
  @ApiOperation({ summary: 'Battle pass XP ekle (oyun sunucusu çağrısı)' })
  addBattlePassXp(@CurrentUser() currentUserId: string, @Body() body: { xpAmount: number }) {
    return this.premiumService.addBattlePassXp(currentUserId, body.xpAmount);
  }

  @Post('passes/:userPassId/claim-tier/:tier')
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
  @ApiOperation({ summary: 'Premium pass iptal et' })
  @ApiParam({ name: 'userPassId', description: 'Kullanıcı pass ID' })
  cancelPass(@CurrentUser() currentUserId: string, @Param('userPassId') userPassId: string) {
    return this.premiumService.cancelPass(currentUserId, userPassId);
  }
}
