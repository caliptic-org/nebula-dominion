import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ProgressionService } from './progression.service';
import { AwardXpDto } from './dto/award-xp.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

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

  @Post('admin/reload-config')
  @UseGuards(HttpJwtGuard, AdminRoleGuard)
  reloadConfig() {
    return this.progressionService.reloadConfig();
  }
}
