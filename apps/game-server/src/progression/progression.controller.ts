import { Body, Controller, ForbiddenException, Get, Param, Post, HttpCode, HttpStatus, UseGuards, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ProgressionService } from './progression.service';
import { AwardXpDto } from './dto/award-xp.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user?: { id?: string; userId?: string } }>();
    return (request.user?.id ?? request.user?.userId ?? '') as string;
  },
);

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

  @Post('admin/reload-config')
  @UseGuards(HttpJwtGuard, AdminRoleGuard)
  reloadConfig() {
    return this.progressionService.reloadConfig();
  }
}
