import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { CommandersService } from './commanders.service';
import { CommanderRace } from './commanders.constants';

const ALLOWED_RACES = new Set(['insan', 'zerg', 'otomat', 'canavar', 'seytan']);

function normalizeRace(v: string | undefined): CommanderRace | null {
  if (!v) return null;
  return ALLOWED_RACES.has(v) ? (v as CommanderRace) : null;
}

@ApiTags('commanders')
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
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the player's commander roster (race-optional filter)" })
  @ApiQuery({ name: 'race', required: false, enum: ['insan', 'zerg', 'otomat', 'canavar', 'seytan'] })
  async list(@Req() req: any, @Query('race') race?: string) {
    const userId: string = req.user?.id;
    return this.service.listForPlayer(userId, normalizeRace(race));
  }

  /**
   * GET /api/commanders/me/active — currently-active commander, or null.
   * Hot path for the HUD chip + bonus engine consumers.
   */
  @Get('me/active')
  @UseGuards(HttpJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the player's active commander (null when none)" })
  async getActive(@Req() req: any) {
    const userId: string = req.user?.id;
    const active = await this.service.getActive(userId);
    return active ?? null;
  }

  /**
   * POST /api/commanders/:id/activate — flip is_active. Body optional.
   * Backend enforces ownership + unlock status.
   */
  @Post(':id/activate')
  @UseGuards(HttpJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate one of the player\'s unlocked commanders' })
  async activate(@Req() req: any, @Param('id') id: string) {
    const userId: string = req.user?.id;
    return this.service.activate(userId, id);
  }

  /**
   * POST /api/commanders/:id/award-xp — manual XP grant (admin / debug).
   * Production XP awards flow through CommandersService.awardXp() from
   * game.service post-battle; this endpoint is for /dev tooling.
   */
  @Post(':id/award-xp')
  @UseGuards(HttpJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually award XP to the player\'s active commander (debug)' })
  async awardXp(@Req() req: any, @Body() body: { amount: number }) {
    const userId: string = req.user?.id;
    const amount = Math.max(0, Math.floor(body.amount ?? 0));
    return this.service.awardXp(userId, amount);
  }
}
