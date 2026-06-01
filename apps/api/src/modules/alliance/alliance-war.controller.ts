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
 */
@ApiTags('Alliance Wars')
@Controller('alliance-wars')
export class AllianceWarController {
  constructor(private readonly warService: AllianceWarService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hedef ittifaka savaş ilan et' })
  declareWar(@Request() req: any, @Body() dto: DeclareWarDto) {
    return this.warService.declareWar(req.user.id, dto.targetAllianceId);
  }

  @Get(':allianceId')
  @ApiOperation({ summary: 'Bir ittifakın savaş geçmişini listele' })
  @ApiParam({ name: 'allianceId', description: 'İttifak UUID' })
  listWars(@Param('allianceId', ParseUUIDPipe) allianceId: string) {
    return this.warService.listWars(allianceId);
  }
}
