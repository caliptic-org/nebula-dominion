'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasSession } from '@/lib/session';

/**
 * Preemptive auth guard for protected routes.
 *
 * Use at the top of a client page component. On mount, checks whether
 * a session token exists; if not, replaces the route with /login?next=
 * (current path) so the post-login redirect can bounce back.
 *
 * Returns a `ready` flag:
 *  - `false` until the auth check resolves (use to short-circuit render
 *    with `if (!ready) return null;`)
 *  - `true` when the player is authenticated and the page can render
 *
 * Distinct from `useAuthGuard` (passive — reacts to 401 errors from
 * data hooks): this one fires BEFORE any data hook runs, so routes like
 * /alliance and /missions can't render their placeholder/zero-state UI
 * to guests at all. Per the audit pass that found those screens
 * happily rendering mock data without a session.
 */
export function useRequireAuth(): boolean {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (hasSession()) {
      setReady(true);
      return;
    }
    // No token — bounce. `next=` lets the login form route back here
    // after a successful auth (LoginForm reads searchParams.get('next')).
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
    router.replace(`/login${next}`);
  }, [router, pathname]);
  return ready;
}
