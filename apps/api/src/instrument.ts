/**
 * Sentry server-side init — must be the FIRST import of the process.
 *
 * `@sentry/node` patches Node's `http`, `https`, `fetch`, etc. to capture
 * transactions automatically. If it loads after our code (or after Nest's
 * AppModule), the patches miss any request handlers that were already
 * registered → no traces, no error breadcrumbs.
 *
 * Therefore main.ts MUST `import './instrument'` on line 1, before any
 * Nest or Express imports.
 */

import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.1,
    // Don't bombard the issues feed with handled 4xx (validation, auth).
    // Only unhandled 5xx + thrown exceptions should land in Sentry.
    ignoreErrors: [
      'UnauthorizedException',
      'BadRequestException',
      'NotFoundException',
      'ForbiddenException',
      'ConflictException',
    ],
  });
  // eslint-disable-next-line no-console
  console.log(`[sentry] initialised, env=${process.env.SENTRY_ENV ?? 'unknown'}`);
}
