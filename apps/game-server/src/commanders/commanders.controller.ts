import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { CommandersService } from './commanders.service';
import { CommanderRace } from './commanders.constants';

// NOTE: @nestjs/swagger is NOT a dependency of game-server (only api uses
// it for its public docs surface). The original draft of this controller
// decorated each route with @ApiOperation / @ApiTags / @ApiBearerAuth —
// which failed the CI build with "Cannot find module '@nestjs/swagger'".
// Game-server isn't part of the Swagger docs surface (api hosts that at
// /api/docs), so the decorators were purely informational; dropping them
// is a no-op for runtime behaviour.

const ALLOWED_RACES = new Set(['insan', 'zerg', 'otomat', 'canavar', 'seytan']);

function normalizeRace(v: string | undefined): CommanderRace | null {
  if (!v) return null;
  return ALLOWED_RACES.has(v) ? (v as CommanderRace) : null;
}

@Controller('commanders')
export class CommandersController {
  constructor(private readonly service: CommandersService) {}

  /**
   * GET /api/commanders[?race=insan] — list this player's roster.
   *
   * Replaces the old api-side stub. The stub returned a static catalog
   * with hard-coded levels; this endpoint returns the player's actual
   * progression (level, xp, isActive, owned). FE useCommanders consumes
   * this same shape after the bridge update.
   */
  @Get()
  @UseGuards(HttpJwtGuard)
  async list(@Req() req: any, @Query('race') race?: string) {
    const userId: string = req.user?.sub;
    return this.service.listForPlayer(userId, normalizeRace(race));
  }

  /**
   * GET /api/commanders/me/active — currently-active commander, or null.
   * Hot path for the HUD chip + bonus engine consumers.
   */
  @Get('me/active')
  @UseGuards(HttpJwtGuard)
  async getActive(@Req() req: any) {
    const userId: string = req.user?.sub;
    const active = await this.service.getActive(userId);
    return active ?? null;
  }

  /**
   * POST /api/commanders/:id/activate — flip is_active. Body optional.
   * Backend enforces ownership + unlock status.
   */
  @Post(':id/activate')
  @UseGuards(HttpJwtGuard)
  async activate(@Req() req: any, @Param('id') id: string) {
    const userId: string = req.user?.sub;
    return this.service.activate(userId, id);
  }

  /**
   * REMOVED: POST /api/commanders/:id/award-xp
   *
   * The previous "manual XP grant (admin / debug)" endpoint was guarded
   * only by HttpJwtGuard, meaning any authenticated player could POST
   * `{amount: 999999999}` and promote their commander from Lv1 to MAX in
   * a single call (BLOCKER F2 / HIGH S5 — 2026-06-06 punch list).
   *
   * Production XP grants flow exclusively through
   * `CommandersService.awardXp()`, which is invoked server-side from
   * `game.service` on battle-won (+100 winner / +30 loser). No FE caller
   * existed for this controller route (verified via repo grep), so the
   * endpoint is deleted outright rather than gated behind AdminRoleGuard.
   *
   * If a future /dev tool needs manual grants, mount the route under
   * `@Controller('admin/commanders')` with
   * `@UseGuards(HttpJwtGuard, AdminRoleGuard)` — mirroring the pattern in
   * `apps/game-server/src/economy/economy.controller.ts`.
   */
}
