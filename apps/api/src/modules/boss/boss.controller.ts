import { Controller, Get, Post, Patch, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BossService } from './boss.service';

@ApiTags('Boss Encounters')
@ApiBearerAuth()
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

  @Get('age2')
  @ApiOperation({ summary: 'Çağ 2 boss karşılaşmaları (Hidra ve Titan)' })
  getAge2Bosses() {
    return this.bossService.getAge2Bosses();
  }

  @Get('hydra')
  @ApiOperation({ summary: 'Hidra boss bilgileri (tüm fazlar)' })
  getHydra() {
    return this.bossService.getHydraEncounters();
  }

  @Get('titan')
  @ApiOperation({ summary: 'Titan boss bilgileri (tüm fazlar)' })
  getTitan() {
    return this.bossService.getTitanEncounters();
  }

  @Post('age2/seed')
  @ApiOperation({ summary: 'Çağ 2 boss\'larını seed et (Hidra ve Titan)' })
  seedAge2Bosses(@Body() body: { ageId: string }) {
    if (!body.ageId) throw new BadRequestException('ageId zorunludur');
    return this.bossService.seedAge2Bosses(body.ageId);
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
    @Body() body: { bossCode: string; unitsDeployed: Record<string, unknown>[] },
  ) {
    const userId = 'demo-user-id';
    return this.bossService.startAttempt(userId, body);
  }

  @Post('attempt/:attemptId/attack')
  @ApiOperation({ summary: 'Boss\'a saldır' })
  @ApiParam({ name: 'attemptId', description: 'Karşılaşma ID' })
  attackBoss(
    @Param('attemptId') attemptId: string,
    @Body() body: { damageDealt: number; mechanicName?: string },
  ) {
    const userId = 'demo-user-id';
    return this.bossService.attackBoss(userId, {
      attemptId,
      damageDealt: body.damageDealt,
      mechanicName: body.mechanicName,
    });
  }

  @Patch('attempt/:attemptId/retreat')
  @ApiOperation({ summary: 'Boss\'tan çekilin' })
  @ApiParam({ name: 'attemptId', description: 'Karşılaşma ID' })
  retreat(@Param('attemptId') attemptId: string) {
    const userId = 'demo-user-id';
    return this.bossService.retreat(userId, attemptId);
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
  getUserAttempts(@Query('bossCode') bossCode?: string) {
    const userId = 'demo-user-id';
    return this.bossService.getUserAttempts(userId, bossCode);
  }
}
