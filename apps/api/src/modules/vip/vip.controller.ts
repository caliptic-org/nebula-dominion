import { Controller, Get, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { VipService } from './vip.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('VIP')
@Controller('api/v1/vip')
export class VipController {
  constructor(private readonly vipService: VipService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcının VIP durumu ve kümülatif harcaması' })
  getMyVipStatus(@Request() req: { user: { id: string } }) {
    return this.vipService.getVipStatus(req.user.id);
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
}
