import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BossService } from './boss.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Boss Encounters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/bosses')
export class BossController {
  constructor(private readonly bossService: BossService) {}

  @Get()
  @ApiOperation({ summary: 'Tüm boss karşılaşmalarını listele' })
  getAllBosses() {
    return this.bossService.getAllBosses();
  }

  @Get('devouring-worm')
  @ApiOperation({ summary: 'Yutucu Kurt boss bilgileri (tüm fazlar)' })
  getDevoringWorm() {
    return this.bossService.getDevoringWormEncounters();
  }

  @Get(':code')
  @ApiOperation({ summary: 'Boss detayını al' })
  @ApiParam({ name: 'code', description: 'Boss kodu (örn: devouring_worm_phase1)' })
  getBoss(@Param('code') code: string) {
    return this.bossService.getBossByCode(code);
  }

  @Post('attempt')
  @ApiOperation({ summary: 'Boss karşılaşması başlat' })
  startAttempt(
    @Request() req: { user: { id: string } },
    @Body() body: { bossCode: string; unitsDeployed: Record<string, unknown>[] },
  ) {
    return this.bossService.startAttempt(req.user.id, body);
  }

  @Post('attempt/:attemptId/attack')
  @ApiOperation({ summary: 'Boss\'a saldır' })
  @ApiParam({ name: 'attemptId', description: 'Karşılaşma ID' })
  attackBoss(
    @Request() req: { user: { id: string } },
    @Param('attemptId') attemptId: string,
    @Body() body: { damageDealt: number; mechanicName?: string },
  ) {
    return this.bossService.attackBoss(req.user.id, {
      attemptId,
      damageDealt: body.damageDealt,
      mechanicName: body.mechanicName,
    });
  }

  @Patch('attempt/:attemptId/retreat')
  @ApiOperation({ summary: 'Boss\'tan çekilin' })
  @ApiParam({ name: 'attemptId', description: 'Karşılaşma ID' })
  retreat(@Request() req: { user: { id: string } }, @Param('attemptId') attemptId: string) {
    return this.bossService.retreat(req.user.id, attemptId);
  }

  @Get(':code/leaderboard')
  @ApiOperation({ summary: 'Boss liderlik tablosu' })
  @ApiParam({ name: 'code', description: 'Boss kodu' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getLeaderboard(@Param('code') code: string, @Query('limit') limit?: number) {
    return this.bossService.getLeaderboard(code, limit);
  }

  @Get('attempts/my')
  @ApiOperation({ summary: 'Kullanıcının boss deneme geçmişi' })
  @ApiQuery({ name: 'bossCode', required: false })
  getUserAttempts(@Request() req: { user: { id: string } }, @Query('bossCode') bossCode?: string) {
    return this.bossService.getUserAttempts(req.user.id, bossCode);
  }
}
