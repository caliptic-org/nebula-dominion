import { Controller, Get, UseGuards } from '@nestjs/common';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { GatesService } from './gates.service';
import { CurrentUser } from '../auth/current-user.decorator';

/**
 * GET /api/gates
 *
 * Returns every gateId → { unlocked, requirements[], primaryHint } resolved
 * against the authenticated player's current state. Frontend hydrates the
 * `useGates()` hook on /base mount and re-fetches on the same events that
 * already invalidate /game/buildings + /tier/progress.
 *
 * NOTE: mounted on its own /gates root (not under /progression/gates) because
 * ProgressionController has a `/progression/:userId` wildcard that captures
 * any sub-segment as a userId. Express matches the wildcard first, so the
 * gates response ends up looking like a progression payload for userId
 * "gates" — confusing failure mode, easier to avoid than to debug later.
 */
@UseGuards(HttpJwtGuard)
@Controller('gates')
export class GatesController {
  constructor(private readonly gates: GatesService) {}

  @Get()
  async getGates(@CurrentUser() userId: string) {
    return this.gates.evaluateAll(userId);
  }
}
