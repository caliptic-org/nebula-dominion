import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
import { ProgressionService } from './progression.service';
import { AwardXpDto } from './dto/award-xp.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(HttpJwtGuard)
@Controller('progression')
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get(':userId')
  getProgress(@Param('userId') userId: string) {
    return this.progressionService.getProgress(userId);
  }

  @Post('award-xp')
  @HttpCode(HttpStatus.OK)
  awardXp(@Body() dto: AwardXpDto, @CurrentUser() currentUserId: string) {
    if (dto.userId !== currentUserId) {
      throw new ForbiddenException('Cannot award XP to another user');
    }
    return this.progressionService.awardXp(dto);
  }

  @Post(':userId/advance-age')
  @HttpCode(HttpStatus.OK)
  advanceAge(@Param('userId') userId: string) {
    return this.progressionService.advanceAge(userId);
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
