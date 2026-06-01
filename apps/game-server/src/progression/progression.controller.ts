import { Body, Controller, ForbiddenException, Get, Param, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ProgressionService } from './progression.service';
import { AwardXpDto } from './dto/award-xp.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(HttpJwtGuard)
@Controller('progression')
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  // Ownership guard: path-param userId must match the JWT subject.  Without
  // this, Player A could fetch Player B's progression / advance their age /
  // read their tx history just by tweaking the URL — a privacy + sabotage
  // hole the audit flagged as CRITICAL. The /admin/reload-config endpoint
  // below is the only path that legitimately wants to act on another user,
  // and it's gated by AdminRoleGuard separately.
  private assertOwn(userId: string, currentUserId: string): void {
    if (userId !== currentUserId) {
      throw new ForbiddenException('Bu kullanıcının ilerlemesine erişemezsin');
    }
  }

  @Get(':userId')
  getProgress(@Param('userId') userId: string, @CurrentUser() currentUserId: string) {
    this.assertOwn(userId, currentUserId);
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
  advanceAge(@Param('userId') userId: string, @CurrentUser() currentUserId: string) {
    this.assertOwn(userId, currentUserId);
    return this.progressionService.advanceAge(userId);
  }

  @Get(':userId/transactions')
  getTransactions(@Param('userId') userId: string, @CurrentUser() currentUserId: string) {
    this.assertOwn(userId, currentUserId);
    return this.progressionService.getRecentTransactions(userId);
  }

  @Post('admin/reload-config')
  @UseGuards(HttpJwtGuard, AdminRoleGuard)
  reloadConfig() {
    return this.progressionService.reloadConfig();
  }
}
