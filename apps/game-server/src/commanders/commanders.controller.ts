import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { InternalServiceGuard } from '../auth/internal-service.guard';
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
   * `game.service` on battle-won (+100 winner / +30 loser) on the
   * Socket.io PvP path, and from the internal endpoint below on the
   * FE `/battle` (battles-stub) path.
   *
   * If a future /dev tool needs manual grants, mount the route under
   * `@Controller('admin/commanders')` with
   * `@UseGuards(HttpJwtGuard, AdminRoleGuard)` — mirroring the pattern in
   * `apps/game-server/src/economy/economy.controller.ts`.
   */

  /**
   * POST /api/commanders/internal/award-xp
   *
   * Server-to-server commander XP grant. Mirrors the cycle-3
   * `/progression/award-xp` + cycle-5
   * `/buildings/internal/recalculate-rates` internal-endpoint pattern:
   * gated by `InternalServiceGuard` (header
   * `X-Internal-Service: Bearer <INTERNAL_SERVICE_SECRET>`), never
   * reachable by a player JWT.
   *
   * ## cycle 17 — BAL-3 prod /battle commander XP fan-out
   *
   * The Socket.io PvP path (`game.service`) already calls
   * `CommandersService.awardXp(userId, +100/+30)`. But the production
   * FE `/battle` screen goes through `apps/api`'s battles-stub
   * controller, which only ever fanned out the WALLET grant — it never
   * touched commander XP. Net effect: the entire `/battle` screen
   * progressed commanders by 0, so the curve flatten above would still
   * never be felt by real players.
   *
   * battles-stub now fans a +100 commander-XP grant out to this endpoint
   * on a WON battle (matching the Socket.io winner payout). The api
   * caller asserts `userId` explicitly because there is no JWT `sub` on
   * an internal call.
   *
   * Body: `{ userId: string; amount: number }`.
   *   - `userId` required; the player to credit.
   *   - `amount` required, must be a positive finite number. We clamp to
   *     a per-call ceiling so a leaked internal secret can't mint a
   *     commander straight to MAX in one POST — mirrors the
   *     `/resources/battle-reward` ceiling defense-in-depth. Honest
   *     callers grant +100, far under the ceiling.
   *
   * Returns `CommandersService.awardXp`'s result, or `{ ok: true,
   * awarded: false }` when the player has no active commander (awardXp
   * returns null). Never throws on "no active commander" — that's a
   * benign no-op, not a client error.
   */
  @Post('internal/award-xp')
  @UseGuards(InternalServiceGuard)
  @HttpCode(HttpStatus.OK)
  async awardXpInternal(
    @Body() body: { userId?: string; amount?: number },
  ): Promise<
    | { ok: true; awarded: false }
    | {
        ok: true;
        awarded: true;
        commanderId: string;
        levelBefore: number;
        levelAfter: number;
        xp: number;
      }
  > {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('body required');
    }
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      throw new BadRequestException('userId required');
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }
    // Per-call ceiling. Honest payout is +100; anything ≫ that is a
    // misuse / leaked-secret signal. Mirrors the battle-reward clamp:
    // loud 400 rather than silent clamp so it surfaces in the logs.
    const PER_CALL_MAX = 1_000;
    if (amount > PER_CALL_MAX) {
      throw new BadRequestException(
        'commander xp amount exceeds per-call ceiling',
      );
    }

    const result = await this.service.awardXp(userId, Math.floor(amount));
    if (!result) {
      // No active commander for this player — benign no-op.
      return { ok: true, awarded: false };
    }
    return {
      ok: true,
      awarded: true,
      commanderId: result.commanderId,
      levelBefore: result.levelBefore,
      levelAfter: result.levelAfter,
      xp: result.xp,
    };
  }

  /**
   * GET /api/commanders/internal/active-power-multiplier?userId=...
   *
   * cycle 26 COMBAT-QUICKBATTLE-POWER-FIX — server-to-server read for the
   * api quick-battle (battles-stub) to scale attacker fleet power by the
   * player's active commander combat bonus, so commander choice/level
   * affects PvE win odds on the FE `/battle` surface (the Socket.io path
   * already applies the bonus). InternalServiceGuard-gated; never reachable
   * by a player JWT. Returns 1.0 when the player has no active commander.
   */
  @Get('internal/active-power-multiplier')
  @UseGuards(InternalServiceGuard)
  async activePowerMultiplierInternal(
    @Query('userId') userId?: string,
  ): Promise<{ userId: string; multiplier: number }> {
    const id = typeof userId === 'string' ? userId.trim() : '';
    if (!id) {
      throw new BadRequestException('userId required');
    }
    const multiplier = await this.service.getActivePowerMultiplier(id);
    return { userId: id, multiplier };
  }
}
