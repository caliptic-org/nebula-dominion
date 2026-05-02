import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Age5ContentService } from './age5-content.service';

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
  @ApiOperation({ summary: 'Kullanıcının Çağ 5 ilerleme durumu' })
  @ApiParam({ name: 'userId', description: 'Kullanıcı UUID' })
  getProgression(@Param('userId') userId: string) {
    return this.contentService.getUserProgression(userId);
  }
}
