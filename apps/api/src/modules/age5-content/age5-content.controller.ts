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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Age5ContentService } from './age5-content.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Age 5 Content')
@Controller('api/v1/content/age5')
export class Age5ContentController {
  constructor(private readonly contentService: Age5ContentService) {}

  @Get()
  @ApiOperation({ summary: 'Çağ 5 genel bilgisi al' })
  getAge5Info() {
    return this.contentService.getAge5Info();
  }

  @Get('levels')
  @ApiOperation({ summary: 'Çağ 5 seviyelerini listele (37-45)' })
  getLevels() {
    return this.contentService.getLevels();
  }

  @Get('levels/:number')
  @ApiOperation({ summary: 'Belirli seviye detayını al' })
  @ApiParam({ name: 'number', description: 'Seviye numarası (37-45)', type: Number })
  getLevel(@Param('number', ParseIntPipe) number: number) {
    return this.contentService.getLevel(number);
  }

  @Get('units')
  @ApiOperation({ summary: 'Çağ 5 birimlerini listele' })
  @ApiQuery({ name: 'race', required: false, description: 'Irk filtresi (human, zerg, automaton, monster, demon)' })
  @ApiQuery({ name: 'level', required: false, type: Number, description: 'Minimum açılma seviyesi' })
  getUnits(
    @Query('race') race?: string,
    @Query('level') level?: number,
  ) {
    return this.contentService.getUnits({ race, levelUnlock: level });
  }

  @Get('units/:code')
  @ApiOperation({ summary: 'Birim detayını al (kod ile)' })
  @ApiParam({ name: 'code', description: 'Birim kodu (örn: human_void_stalker)' })
  getUnit(@Param('code') code: string) {
    return this.contentService.getUnitByCode(code);
  }

  @Get('progression/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcının Çağ 5 ilerleme durumu (self-only)' })
  @ApiParam({ name: 'userId', description: 'Kullanıcı UUID' })
  // SEC/IDOR: previously unauthenticated and accepted any :userId, leaking
  // another user's progression. Now requires a JWT and the path userId must
  // match req.user.id.
  getProgression(
    @Request() req: { user: { id: string } },
    @Param('userId') userId: string,
  ) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('You can only access your own progression');
    }
    return this.contentService.getUserProgression(userId);
  }
}
