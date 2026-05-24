import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/* Stub controller — see formations.module.ts for context.
 *
 * Returns empty paginated formations + a small static template list so
 * the /formation screen has something to render without surfacing 404s
 * during the autonomous QA crawler runs.
 *
 * TODO: replace with real persistence + service-driven derivation when
 * the formation backend lands. Don't add Post/Put/Delete here without
 * the service — the screen falls back to client-side state for those.
 */
@ApiTags('formations')
@Controller('formations')
export class FormationsController {
  /** GET /formations?playerId=X&page=1&limit=50 — paginated saved formations. */
  @Get()
  @ApiOperation({ summary: 'List saved formations for a player (stub)' })
  @ApiQuery({ name: 'playerId', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(
    @Query('playerId') _playerId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return {
      formations: [],
      page: Number(page),
      limit: Number(limit),
      total: 0,
    };
  }

  /** GET /formations/templates — static template catalog (preset layouts). */
  @Get('templates')
  @ApiOperation({ summary: 'List preset formation templates (stub)' })
  listTemplates() {
    return [
      {
        id: 'standard-3x5',
        name: 'Standart Saldırı',
        description: '3 sıra · 5 kolon. Yakın dövüşçü öne, menzilli arka sıraya.',
        rows: 3,
        cols: 5,
        recommendedRoles: ['tank', 'assault', 'sniper'],
      },
      {
        id: 'defensive-2x5',
        name: 'Savunma Falanksı',
        description: 'İki sıra. Tank duvarı önde, destek arkada. PvP defansı için ideal.',
        rows: 2,
        cols: 5,
        recommendedRoles: ['tank', 'support'],
      },
      {
        id: 'rush-1x6',
        name: 'Hücum Hattı',
        description: 'Tek sıra, geniş ön cephe. Yüksek hızlı birim akınları.',
        rows: 1,
        cols: 6,
        recommendedRoles: ['assault', 'stealth'],
      },
    ];
  }
}
