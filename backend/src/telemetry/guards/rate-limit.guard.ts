import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';

class TooManyRequestsException extends HttpException {
  constructor(message = 'Too Many Requests') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';

// Fixed window: 200 requests per 60-second window per IP
const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 200;

interface WindowState {
  count: number;
  expiresAt: number; // unix ms
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private readonly redis: RedisService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    const key = `telemetry:rl:${ip}`;

    try {
      const raw = await this.redis.get(key);
      const now = Date.now();

      let state: WindowState;

      if (raw) {
        state = JSON.parse(raw) as WindowState;
        if (now > state.expiresAt) {
          // Window expired — start fresh
          state = { count: 1, expiresAt: now + WINDOW_SECONDS * 1000 };
        } else {
          if (state.count >= MAX_REQUESTS) {
            throw new TooManyRequestsException('Rate limit exceeded. Max 200 requests/min.');
          }
          state.count += 1;
        }
      } else {
        state = { count: 1, expiresAt: now + WINDOW_SECONDS * 1000 };
      }

      // Persist with TTL equal to the remaining window time so Redis cleans up
      const ttl = Math.ceil((state.expiresAt - now) / 1000);
      await this.redis.set(key, JSON.stringify(state), ttl > 0 ? ttl : WINDOW_SECONDS);
    } catch (err) {
      if (err instanceof TooManyRequestsException) throw err;
      // Redis unavailable — fail open to avoid dropping events
      this.logger.warn(`Rate limit Redis error (fail-open): ${(err as Error).message}`);
    }

    return true;
  }
}
