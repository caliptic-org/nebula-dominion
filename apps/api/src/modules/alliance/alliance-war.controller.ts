import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AllianceWarService } from './alliance-war.service';
import { DeclareWarDto } from './dto/declare-war.dto';

/**
 * Alliance War endpoints — clean, MVP-scope surface.
 *
 * NOTE: Nest's global prefix is `api/v1` (set in main.ts). The controller
 * path MUST NOT include that prefix or Nest will mount the route at
 * `/api/v1/api/v1/...` — the existing AllianceController has that bug and
 * its routes are unreachable. Use `'alliance-wars'` only.
 *
 * Audit cycle 7 (HIGH IDOR-ALLIANCE-WAR-LIST-02 / CHAIN-ALLIANCE-WARS-LEAK):
 * Cycle 6 plugged the war-list leak on /alliances/:id/wars (AllianceController
 * → AllianceService.getWars) but missed THIS controller entirely. The class
 * had no @UseGuards anywhere, and the GET handler took only the path param,
 * so any anonymous client could `curl /api/v1/alliance-wars/<uuid>` and pull
 * every alliance's full active+historical war ledger with attacker/defender
 * relations eagerly joined — leaking strategic state (who is at war with
 * whom, who just lost, who is currently distracted). The FE `useAllianceWars`
 * hook actually hits this path, not the AllianceController one, so the
 * cycle 6 fix didn't even close the live exploit surface.
 *
 * Fix: class-level JwtAuthGuard + membership assertion in the service so
 * only members of the queried alliance can read its war ledger. The 401
 * branch in useAllianceWars covers guest reads; the new 403 surfaces as a
 * regular error to non-member authenticated users (the page already renders
 * an empty list when `wars` is empty, so the user just sees "no wars").
 */
@ApiTags('Alliance Wars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alliance-wars')
export class AllianceWarController {
  constructor(private readonly warService: AllianceWarService) {}

  @Post()
  @ApiOperation({ summary: 'Hedef ittifaka savaş ilan et' })
  declareWar(@Request() req: any, @Body() dto: DeclareWarDto) {
    return this.warService.declareWar(req.user.id, dto.targetAllianceId);
  }

  @Get(':allianceId')
  @ApiOperation({ summary: 'Bir ittifakın savaş geçmişini listele' })
  @ApiParam({ name: 'allianceId', description: 'İttifak UUID' })
  listWars(
    @Request() req: any,
    @Param('allianceId', ParseUUIDPipe) allianceId: string,
  ) {
    return this.warService.listWars(req.user.id, allianceId);
  }
}
