import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Age3ContentService } from './age3-content.service';

@ApiTags('Age 3 Content')
@Controller('api/v1/content/age3')
export class Age3ContentController {
  constructor(private readonly contentService: Age3ContentService) {}

  @Get()
  @ApiOperation({ summary: 'Çağ 3 genel bilgisi al' })
  getAge3Info() {
    return this.contentService.getAge3Info();
  }

  @Get('levels')
  @ApiOperation({ summary: 'Çağ 3 seviyelerini listele (19-27)' })
  getLevels() {
    return this.contentService.getLevels();
  }

  @Get('levels/:number')
  @ApiOperation({ summary: 'Belirli seviye detayını al' })
  @ApiParam({ name: 'number', description: 'Seviye numarası (19-27)', type: Number })
  getLevel(@Param('number', ParseIntPipe) number: number) {
    return this.contentService.getLevel(number);
  }

  @Get('units')
  @ApiOperation({ summary: 'Çağ 3 birimlerini listele' })
  @ApiQuery({ name: 'race', required: false, description: 'Irk filtresi (human, zerg, automaton, monster, demon)' })
  @ApiQuery({ name: 'level', required: false, type: Number, description: 'Minimum açılma seviyesi' })
  getUnits(@Query('race') race?: string, @Query('level') level?: number) {
    return this.contentService.getUnits({ race, levelUnlock: level });
  }

  @Get('units/monster')
  @ApiOperation({ summary: 'Canavarlar ırkı birimlerini listele' })
  getMonsterUnits() {
    return this.contentService.getMonsterUnits();
  }

  @Get('units/:code')
  @ApiOperation({ summary: 'Birim detayını al (kod ile)' })
  @ApiParam({ name: 'code', description: 'Birim kodu (örn: monster_elder_beast)' })
  getUnit(@Param('code') code: string) {
    return this.contentService.getUnitByCode(code);
  }
}
