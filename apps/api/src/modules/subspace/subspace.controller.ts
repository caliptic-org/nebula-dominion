import { Controller, Get, Post, Patch, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SubspaceService } from './subspace.service';
import { EnterSubspaceDto, StartSubspaceBattleDto } from './dto/enter-subspace.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Subspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  enterSubspace(@Request() req: { user: { id: string } }, @Body() dto: EnterSubspaceDto) {
    return this.subspaceService.enterSubspace(req.user.id, dto);
  }

  @Patch('sessions/:sessionId/exit')
  @ApiOperation({ summary: 'Subspace\'ten çıkış yap (normal)' })
  @ApiParam({ name: 'sessionId', description: 'Oturum ID' })
  exitSubspace(@Request() req: { user: { id: string } }, @Param('sessionId') sessionId: string) {
    return this.subspaceService.exitSubspace(req.user.id, sessionId, false);
  }

  @Patch('sessions/:sessionId/flee')
  @ApiOperation({ summary: 'Subspace\'ten kaç (ödül azalır)' })
  @ApiParam({ name: 'sessionId', description: 'Oturum ID' })
  fleeSubspace(@Request() req: { user: { id: string } }, @Param('sessionId') sessionId: string) {
    return this.subspaceService.exitSubspace(req.user.id, sessionId, true);
  }

  @Post('sessions/:sessionId/hazard')
  @ApiOperation({ summary: 'Rastgele tehlike olayı tetikle (oyun motoru çağrısı)' })
  @ApiParam({ name: 'sessionId', description: 'Oturum ID' })
  triggerHazard(@Param('sessionId') sessionId: string) {
    return this.subspaceService.applyHazard(sessionId);
  }

  @Post('battles')
  @ApiOperation({ summary: 'Subspace savaşı başlat' })
  startBattle(@Request() req: { user: { id: string } }, @Body() dto: StartSubspaceBattleDto) {
    return this.subspaceService.startBattle(req.user.id, dto);
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
  getUserSessions(@Request() req: { user: { id: string } }) {
    return this.subspaceService.getUserSessions(req.user.id);
  }
}
