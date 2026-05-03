'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, FetchError } from '@/lib/api';
import { clearTokens, hasSession, type SessionUser } from '@/lib/session';

interface UseSessionOptions {
  /** When true, redirect to /login if no token / 401. Default: true. */
  redirectOnUnauthenticated?: boolean;
  /** Where to send unauthenticated callers. Default: '/login'. */
  loginPath?: string;
}

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads the authenticated user via /auth/me and gates access to protected
 * pages. The hook redirects to the login route when no token is present or
 * when the API returns 401, clearing stale tokens in the process.
 */
export function useSession(options: UseSessionOptions = {}) {
  const { redirectOnUnauthenticated = true, loginPath = '/login' } = options;
  const router = useRouter();
  const [state, setState] = useState<SessionState>({
    user: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    if (!hasSession()) {
      setState({ user: null, loading: false, error: null });
      if (redirectOnUnauthenticated) router.replace(loginPath);
      return;
    }

    try {
      const user = await api.get<SessionUser>('/auth/me');
      setState({ user, loading: false, error: null });
    } catch (err) {
      if (err instanceof FetchError && err.status === 401) {
        clearTokens();
        setState({ user: null, loading: false, error: null });
        if (redirectOnUnauthenticated) router.replace(loginPath);
        return;
      }
      const message = err instanceof Error ? err.message : 'Oturum yüklenemedi';
      setState({ user: null, loading: false, error: message });
    }
  }, [router, redirectOnUnauthenticated, loginPath]);

  useEffect(() => {
    load();
  }, [load]);

  const logout = useCallback(() => {
    clearTokens();
    setState({ user: null, loading: false, error: null });
    router.replace(loginPath);
  }, [router, loginPath]);

  return {
    user: state.user,
    userId: state.user?.id ?? null,
    loading: state.loading,
    error: state.error,
    refresh: load,
    logout,
  };
}
