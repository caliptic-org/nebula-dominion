import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { VipService } from './vip.service';

@ApiTags('VIP')
@Controller('api/v1/vip')
export class VipController {
  constructor(private readonly vipService: VipService) {}

  @Get('status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcının VIP durumu ve kümülatif harcaması' })
  getMyVipStatus() {
    const userId = 'demo-user-id';
    return this.vipService.getVipStatus(userId);
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'VIP kademesi bazında ARPPU cohort analizi' })
  getArppuCohorts() {
    return this.vipService.getArppuCohorts();
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcı satın alma geçmişi (telemetri)' })
  getPurchaseHistory() {
    const userId = 'demo-user-id';
    return this.vipService.getUserPurchaseHistory(userId);
  }
}
