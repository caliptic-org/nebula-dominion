import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Allow only callers presenting a shared service secret.
 *
 * Wires the audit fix (S4 + F4-econ) for
 * `POST /api/progression/award-xp`. The endpoint was previously gated
 * only by HttpJwtGuard + an ownership check (`dto.userId === currentUserId`),
 * which meant any authenticated player could POST
 * `{ userId: <self>, source: 'PVP_VICTORY' }` against their OWN
 * account 200 times and farm unlimited XP — referenceId was
 * @IsOptional, so the duplicate-grant idempotency check never tripped.
 *
 * Legitimate callers are all server-side:
 *   - apps/game-server internal services (TutorialController,
 *     units.service, buildings.service, game.service) call
 *     ProgressionService.awardXp() in-process — they don't need the
 *     HTTP endpoint at all.
 *   - apps/api modules (research-stub, daily-engagement) POST to the
 *     endpoint via fetch — they now sign the request with the same
 *     INTERNAL_SERVICE_SECRET (or JWT_SECRET fallback) that the
 *     /quest-progress/increment endpoint already requires.
 *
 * The FE NEVER calls this endpoint directly. If a player's client
 * tries to, they get 401 — which is the desired behavior post-fix.
 *
 * Mirrors apps/api/src/modules/quest-progress/guards/internal-service.guard.ts
 * intentionally — keep them in sync. Header: `X-Internal-Service: Bearer <token>`.
 * In dev/test where neither env is set, the guard refuses every call
 * rather than fail-open.
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  private readonly logger = new Logger(InternalServiceGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const raw = req.headers['x-internal-service'];
    const headerVal = Array.isArray(raw) ? raw[0] : raw;
    if (!headerVal) {
      throw new UnauthorizedException('Missing X-Internal-Service header');
    }
    const token = headerVal.startsWith('Bearer ')
      ? headerVal.slice('Bearer '.length).trim()
      : headerVal.trim();

    const internalSecret =
      this.config.get<string>('INTERNAL_SERVICE_SECRET') ||
      this.config.get<string>('JWT_SECRET') ||
      this.config.get<string>('jwt.secret');

    if (!internalSecret) {
      this.logger.error(
        'InternalServiceGuard configured but neither INTERNAL_SERVICE_SECRET ' +
          'nor JWT_SECRET is set — refusing all calls. Set one in the game-server env.',
      );
      throw new UnauthorizedException('Internal service auth not configured');
    }

    if (token !== internalSecret) {
      this.logger.warn('Rejected /progression/award-xp: wrong service token');
      throw new UnauthorizedException('Invalid internal service token');
    }
    return true;
  }
}
