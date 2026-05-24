/**
 * Sentry — Edge runtime (middleware, edge route handlers).
 *
 * Edge runtime is a stripped-down V8 isolate — no Node APIs. Sentry's edge
 * config is intentionally minimal: no replay, no profiling, just error
 * capture with low trace sampling.
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NEXT_PUBLIC_SENTRY_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: 0.05,
  });
}
