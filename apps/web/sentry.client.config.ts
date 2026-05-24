/**
 * Sentry — browser-side error monitoring.
 *
 * Init runs once per page-load. When `NEXT_PUBLIC_SENTRY_DSN` is empty
 * Sentry's init is a no-op (it logs a single warning and bails) so dev/CI
 * environments don't waste a worker slot.
 *
 * Sample rates:
 *   - tracesSampleRate 0.1   — 10% of transactions for perf monitoring
 *   - replaysSessionSampleRate 0.0 — disabled by default (Session Replay
 *     records DOM + network, costs $$$ and surfaces PII — flip to 0.05 once
 *     we're confident PII masking covers password/email inputs)
 *   - replaysOnErrorSampleRate 1.0 — when an error fires, ALWAYS attach the
 *     last 30s of session for repro context
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Drop benign noise that pollutes the issues feed without action value.
    ignoreErrors: [
      // Resize-observer loops in some browser extensions
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications.',
      // Network errors from offline players (we already handle gracefully)
      'Network request failed',
      'NetworkError when attempting to fetch resource.',
      'Load failed',
    ],
  });
}
