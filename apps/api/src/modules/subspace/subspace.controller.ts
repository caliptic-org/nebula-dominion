import { Controller, Get, Post, Patch, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SubspaceService } from './subspace.service';
import { EnterSubspaceDto, StartSubspaceBattleDto } from './dto/enter-subspace.dto';

@ApiTags('Subspace')
@ApiBearerAuth()
@Controller('api/v1/subspace')
export class SubspaceController {
  constructor(private readonly subspaceService: SubspaceService) {}

  @Get('zones')
  @ApiOperation({ summary: 'Erişilebilir subspace bölgelerini listele' })
  @ApiQuery({ name: 'level', required: false, type: Number, description: 'Kullanıcı seviyesi' })
  getZones(@Query('level', new ParseIntPipe({ optional: true })) level?: number) {
    return this.subspaceService.getZones(level);
  }

  @Get('zones/:code')
  @ApiOperation({ summary: 'Subspace bölgesi detayı' })
  @ApiParam({ name: 'code', description: 'Bölge kodu (örn: subspace_alpha)' })
  getZone(@Param('code') code: string) {
    return this.subspaceService.getZoneByCode(code);
  }

  @Post('enter')
  @ApiOperation({ summary: 'Subspace bölgesine gir' })
  enterSubspace(@Body() dto: EnterSubspaceDto) {
    // Production'da userId JWT'den alınır
    const userId = 'demo-user-id';
    return this.subspaceService.enterSubspace(userId, dto);
  }

  @Patch('sessions/:sessionId/exit')
  @ApiOperation({ summary: 'Subspace\'ten çıkış yap (normal)' })
  @ApiParam({ name: 'sessionId', description: 'Oturum ID' })
  exitSubspace(@Param('sessionId') sessionId: string) {
    const userId = 'demo-user-id';
    return this.subspaceService.exitSubspace(userId, sessionId, false);
  }

  @Patch('sessions/:sessionId/flee')
  @ApiOperation({ summary: 'Subspace\'ten kaç (ödül azalır)' })
  @ApiParam({ name: 'sessionId', description: 'Oturum ID' })
  fleeSubspace(@Param('sessionId') sessionId: string) {
    const userId = 'demo-user-id';
    return this.subspaceService.exitSubspace(userId, sessionId, true);
  }

  @Post('sessions/:sessionId/hazard')
  @ApiOperation({ summary: 'Rastgele tehlike olayı tetikle (oyun motoru çağrısı)' })
  @ApiParam({ name: 'sessionId', description: 'Oturum ID' })
  triggerHazard(@Param('sessionId') sessionId: string) {
    return this.subspaceService.applyHazard(sessionId);
  }

  @Post('battles')
  @ApiOperation({ summary: 'Subspace savaşı başlat' })
  startBattle(@Body() dto: StartSubspaceBattleDto) {
    const userId = 'demo-user-id';
    return this.subspaceService.startBattle(userId, dto);
  }

  @Patch('battles/:battleId/resolve')
  @ApiOperation({ summary: 'Subspace savaşını sonuçlandır' })
  @ApiParam({ name: 'battleId', description: 'Savaş ID' })
  resolveBattle(
    @Param('battleId') battleId: string,
    @Body() body: { defenderUnits: Record<string, unknown>[] },
  ) {
    return this.subspaceService.resolveBattle(battleId, body.defenderUnits);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Kullanıcının subspace oturumlarını listele' })
  getUserSessions() {
    const userId = 'demo-user-id';
    return this.subspaceService.getUserSessions(userId);
  }
}
