import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ProgressionService } from './progression.service';
import { AwardXpDto } from './dto/award-xp.dto';

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
}
