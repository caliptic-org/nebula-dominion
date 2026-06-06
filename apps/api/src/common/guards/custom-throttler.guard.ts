import { Injectable, HttpException, HttpStatus, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom ThrottlerGuard that surfaces a Turkish-language 429 body matching
 * the rest of the API's error responses. Falls back to default headers from
 * upstream ThrottlerGuard.
 *
 * Tracker behaviour:
 *   The default ThrottlerGuard tracker keys off `req.ip`. With Express
 *   `trust proxy` set in main.ts (see deploy topology note there),
 *   `req.ip` already resolves to the real client IP. We override
 *   `getTracker` only to prefer `req.ips[0]` when present — that is the
 *   leftmost X-Forwarded-For entry as parsed by Express's trusted-hop
 *   logic — which is the most defensive choice if anything else in the
 *   middleware chain ever mutates `req.ip`.
 *
 * Body shape:
 *   { statusCode: 429, message: "Çok fazla istek — biraz sonra tekrar dene" }
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // req.ips is populated by Express only when `trust proxy` is set AND
    // the request actually came through a trusted hop with X-Forwarded-For.
    // Otherwise fall back to req.ip (which respects trust-proxy too).
    if (Array.isArray(req.ips) && req.ips.length > 0) {
      return req.ips[0];
    }
    return req.ip;
  }

  protected async throwThrottlingException(_context: ExecutionContext): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Çok fazla istek — biraz sonra tekrar dene',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

// Re-export to keep import surface tiny for consumers that only need the type.
export { ThrottlerException };
