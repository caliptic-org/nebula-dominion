import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ProgressionService } from './progression.service';
import { AwardXpDto } from './dto/award-xp.dto';
import { AdvanceAgeDto } from './dto/era-transition.dto';

@Controller('progression')
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get(':userId')
  getProgress(@Param('userId') userId: string) {
    return this.progressionService.getProgress(userId);
  }

  @Post('award-xp')
  @HttpCode(HttpStatus.OK)
  awardXp(@Body() dto: AwardXpDto) {
    return this.progressionService.awardXp(dto);
  }

  @Get(':userId/transactions')
  getTransactions(@Param('userId') userId: string) {
    return this.progressionService.getRecentTransactions(userId);
  }

  @Post('advance-age')
  @HttpCode(HttpStatus.OK)
  advanceAge(@Body() dto: AdvanceAgeDto) {
    return this.progressionService.advanceAge(dto.userId);
  }

  @Get(':userId/active-boost')
  getActiveBoost(@Param('userId') userId: string) {
    return this.progressionService.getActiveProductionBoost(userId);
  }
}
