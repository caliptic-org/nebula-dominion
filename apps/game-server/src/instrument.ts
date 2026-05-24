/**
 * Sentry init — must be the FIRST import of the process.
 * See apps/api/src/instrument.ts for full rationale.
 *
 * game-server-specific tweaks:
 *   - Lower sample rate (0.05) — this service handles tight tick loops,
 *     instrumenting every WebSocket event would flood the issues feed.
 *   - Same ignore list as api for handled NestJS exceptions.
 */

import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.05,
    ignoreErrors: [
      'UnauthorizedException',
      'BadRequestException',
      'NotFoundException',
      'ForbiddenException',
      'ConflictException',
      // socket.io disconnect noise
      'transport close',
      'transport error',
      'ping timeout',
    ],
  });
  // eslint-disable-next-line no-console
  console.log(`[sentry] game-server initialised, env=${process.env.SENTRY_ENV ?? 'unknown'}`);
}
