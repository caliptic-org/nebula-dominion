/**
 * Sentry — Node.js (Next.js Server Components, route handlers, middleware) side.
 *
 * Edge runtime config is split into sentry.edge.config.ts because the Edge
 * runtime doesn't support `@sentry/node` internals (no fs, no async hooks).
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NEXT_PUBLIC_SENTRY_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: 0.1,
  });
}
