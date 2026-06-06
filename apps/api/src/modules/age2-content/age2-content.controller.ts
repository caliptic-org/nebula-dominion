import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Age2ContentService } from './age2-content.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Age 2 Content')
@Controller('content/age2')
export class Age2ContentController {
  constructor(private readonly service: Age2ContentService) {}

  @Get()
  @ApiOperation({ summary: 'Çağ 2 genel bilgisi al' })
  getAge2Info() {
    return this.service.getAge2Info();
  }

  @Get('levels')
  @ApiOperation({ summary: 'Çağ 2 seviyelerini listele (10-18)' })
  getLevels() {
    return this.service.getLevels();
  }

  @Get('levels/:number')
  @ApiOperation({ summary: 'Belirli seviye detayını al' })
  @ApiParam({ name: 'number', description: 'Seviye numarası (10-18)', type: Number })
  getLevel(@Param('number', ParseIntPipe) number: number) {
    return this.service.getLevel(number);
  }

  @Get('units')
  @ApiOperation({ summary: 'Çağ 2 birimlerini listele' })
  @ApiQuery({ name: 'race', required: false, description: 'Irk filtresi (human, zerg, automaton, monster)' })
  @ApiQuery({ name: 'levelUnlock', required: false, type: Number, description: 'Minimum açılma seviyesi' })
  getUnits(
    @Query('race') race?: string,
    @Query('levelUnlock', new ParseIntPipe({ optional: true })) levelUnlock?: number,
  ) {
    return this.service.getUnits({ race, levelUnlock });
  }

  @Get('units/:code')
  @ApiOperation({ summary: 'Birim detayını al (kod ile)' })
  @ApiParam({ name: 'code', description: 'Birim kodu' })
  getUnitByCode(@Param('code') code: string) {
    return this.service.getUnitByCode(code);
  }

  @Get('automata/mutations')
  @ApiOperation({ summary: 'Automata mutasyon ağacını al' })
  getMutationTree() {
    return this.service.getAutomataMutationTree();
  }

  @Get('automata/mutations/tier/:tier')
  @ApiOperation({ summary: 'Belirli tier mutasyonlarını al' })
  @ApiParam({ name: 'tier', description: 'Mutasyon tier (1, 2 veya 3)', type: Number })
  getMutationsByTier(@Param('tier', ParseIntPipe) tier: number) {
    return this.service.getAutomataMutationsByTier(tier);
  }

  @Get('progression/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcının Çağ 2 ilerleme durumu (self-only)' })
  @ApiParam({ name: 'userId', description: 'Kullanıcı UUID' })
  // SEC/IDOR: previously unauthenticated and accepted any :userId, leaking
  // another user's progression. Now requires a JWT and the path userId must
  // match req.user.id.
  getUserProgression(
    @Request() req: { user: { id: string } },
    @Param('userId') userId: string,
  ) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('You can only access your own progression');
    }
    return this.service.getUserProgression(userId);
  }
}
