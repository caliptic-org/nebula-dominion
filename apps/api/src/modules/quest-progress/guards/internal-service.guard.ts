import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

/** Constant-time string compare so the shared secret can't be inferred from
 *  response timing (cycle-30 TIMING-SIDE-CHANNEL). Length mismatch
 *  short-circuits (length isn't sensitive); equal-length inputs go byte-safe. */
function timingSafeStrEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Allow only callers presenting a shared service secret.
 *
 * Wires the audit fix (workflow wf_cea4d7f7-3f1, B1) for
 * `POST /quest-progress/increment`. The endpoint was previously public:
 * anyone could POST `{ userId, questId, amount }` and bump another
 * player's quest counter past its target — instant XP + reward harvest
 * on the next /daily/quests/.../claim. A live smoke ran lv1 → ~lv7
 * by hammering the endpoint with bogus userIds.
 *
 * game-server is the only legitimate caller (see
 * apps/game-server/src/quest-progress/quest-progress-notifier.service.ts).
 * It now signs the request with the same JWT_SECRET both services
 * share (CLAUDE.md §1 — cross-service JWT), via the header
 * `X-Internal-Service: Bearer <token>`. The guard accepts when:
 *   - the header is present
 *   - and its bearer matches `INTERNAL_SERVICE_SECRET` (or, as a
 *     fallback, `JWT_SECRET` — the only secret game-server already
 *     has access to today, no separate config required).
 *
 * In dev/test where neither env is set, the guard refuses every
 * call rather than fail-open. Switch INTERNAL_SERVICE_SECRET on
 * before running the test harness or game-server's notifier.
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
      this.config.get<string>('JWT_SECRET');

    if (!internalSecret) {
      this.logger.error(
        'InternalServiceGuard configured but neither INTERNAL_SERVICE_SECRET ' +
          'nor JWT_SECRET is set — refusing all calls. Set one in the api env.',
      );
      throw new UnauthorizedException('Internal service auth not configured');
    }

    if (!timingSafeStrEqual(token, internalSecret)) {
      this.logger.warn('Rejected /quest-progress/increment: wrong service token');
      throw new UnauthorizedException('Invalid internal service token');
    }
    return true;
  }
}
