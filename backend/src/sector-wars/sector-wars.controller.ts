import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SectorWarsService } from './sector-wars.service';
import { AttackSectorDto } from './dto/attack-sector.dto';
import { JoinLeagueDto } from './dto/join-league.dto';

@ApiTags('sector-wars')
@Controller({ path: 'sector-wars', version: '1' })
export class SectorWarsController {
  constructor(private readonly svc: SectorWarsService) {}

  // ─── Sector Map ─────────────────────────────────────────────────────────────

  @Get('sectors')
  @ApiOperation({ summary: 'Get full galactic sector map' })
  @ApiResponse({ status: 200, description: 'All sectors with control and bonus info' })
  getSectorMap() {
    return this.svc.getSectorMap();
  }

  @Get('sectors/:id')
  @ApiOperation({ summary: 'Get a single sector with battle history' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getSector(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getSector(id);
  }

  @Get('sectors/alliance/:allianceId')
  @ApiOperation({ summary: 'Get all sectors controlled by an alliance' })
  @ApiParam({ name: 'allianceId', type: 'string', format: 'uuid' })
  getAllianceSectors(@Param('allianceId', ParseUUIDPipe) allianceId: string) {
    return this.svc.getAllianceSectors(allianceId);
  }

  // ─── Sector Battles ──────────────────────────────────────────────────────────

  @Post('sectors/:id/attack')
  @ApiOperation({ summary: 'Launch an attack on a sector' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Battle created' })
  attackSector(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AttackSectorDto) {
    return this.svc.attackSector(id, dto);
  }

  @Post('battles/:id/resolve/:winner')
  @ApiOperation({ summary: 'Resolve a sector battle (internal/admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'winner', enum: ['attacker', 'defender'] })
  resolveBattle(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('winner') winner: 'attacker' | 'defender',
  ) {
    return this.svc.resolveSectorBattle(id, winner);
  }

  @Get('battles/active')
  @ApiOperation({ summary: 'List all active sector battles' })
  getActiveBattles() {
    return this.svc.getActiveBattles();
  }

  // ─── Weekly Leagues ──────────────────────────────────────────────────────────

  @Get('leagues')
  @ApiOperation({ summary: 'Get all active weekly leagues' })
  getLeagues() {
    return this.svc.getActiveLeagues();
  }

  @Get('leagues/:id')
  @ApiOperation({ summary: 'Get a specific league' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getLeague(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getLeague(id);
  }

  @Post('leagues/:id/join')
  @ApiOperation({ summary: 'Join a weekly league' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  joinLeague(@Param('id', ParseUUIDPipe) id: string, @Body() dto: JoinLeagueDto) {
    return this.svc.joinLeague(id, dto);
  }

  @Get('leagues/:id/standings')
  @ApiOperation({ summary: 'Get league standings (Redis-backed ranking)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max 100 (default 50)' })
  getLeagueStandings(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.svc.getLeagueStandings(id, Math.min(limit, 100));
  }
}
