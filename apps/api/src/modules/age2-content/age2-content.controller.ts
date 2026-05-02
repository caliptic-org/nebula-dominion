import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Age2ContentService } from './age2-content.service';

@ApiTags('Age 2 Content')
@Controller('api/v1/content/age2')
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
  @ApiOperation({ summary: 'Kullanıcının Çağ 2 ilerleme durumu' })
  @ApiParam({ name: 'userId', description: 'Kullanıcı UUID' })
  getUserProgression(@Param('userId') userId: string) {
    return this.service.getUserProgression(userId);
  }
}
