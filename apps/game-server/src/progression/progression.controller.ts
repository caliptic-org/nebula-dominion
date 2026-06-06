import { Body, Controller, ForbiddenException, Get, Param, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ProgressionService } from './progression.service';
import { AwardXpDto } from './dto/award-xp.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { InternalServiceGuard } from '../auth/internal-service.guard';
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

  // ── AUDIT FIX (S4 + F4-econ) ─────────────────────────────────────
  // Previously gated by HttpJwtGuard + an ownership check
  // (`dto.userId === currentUserId`). That let any authenticated
  // player POST `{ userId: <self>, source: 'PVP_VICTORY' }` 200 times
  // and farm unlimited XP — `referenceId` was @IsOptional so the
  // duplicate-grant idempotency check never fired, and xp_transactions
  // had no UNIQUE(user_id, source, reference_id) constraint at the
  // DB layer either. Reachable mid-match: a winning POST burst from
  // any browser could cascade Çağ 1 → Çağ 6 in seconds.
  //
  // The endpoint is now server-only. Legitimate game-server callers
  // (TutorialController, units/buildings/game.service) invoke
  // ProgressionService.awardXp() in-process and don't traverse this
  // HTTP route. Cross-service callers in apps/api (research-stub,
  // daily-engagement) sign with the same X-Internal-Service header
  // /quest-progress/increment already uses (shared INTERNAL_SERVICE_SECRET
  // or JWT_SECRET fallback). The FE has no business calling this and
  // will get 401 if it tries.
  //
  // Override at the method level — class-level HttpJwtGuard is replaced,
  // not augmented (Nest `UseGuards` overrides at the more specific scope).
  @Post('award-xp')
  @UseGuards(InternalServiceGuard)
  @HttpCode(HttpStatus.OK)
  awardXp(@Body() dto: AwardXpDto) {
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
