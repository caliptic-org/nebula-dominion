'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

/* Player's currently-activated commander from `GET /commanders/me/active`.
 *
 * Returns `null` for guests AND for authenticated players who haven't
 * picked one yet (the stub responds 404 in that case — we translate the
 * 404 to a null state so the consumer renders the "no active commander"
 * variant without throwing).
 *
 * Exposes a `refresh()` so the /commanders screen can re-fetch after a
 * successful POST :id/activate without waiting for the next mount. */

export interface ActiveCommanderDto {
  commanderId: string;
  activatedAt: string;
  name: string;
}

interface UseActiveCommanderResult {
  data: ActiveCommanderDto | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
  refresh: () => void;
}

export function useActiveCommander(): UseActiveCommanderResult {
  const [data, setData] = useState<ActiveCommanderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [bump, setBump] = useState(0);

  const refresh = useCallback(() => setBump((n) => n + 1), []);

  useEffect(() => {
    if (!hasSession()) {
      setLoading(false);
      setAuthenticated(false);
      setData(null);
      return;
    }
    setAuthenticated(true);

    let cancelled = false;
    setLoading(true);
    api
      .get<ActiveCommanderDto>('/commanders/me/active')
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof FetchError && err.status === 404) {
          // No active commander yet — not an error from the UI's POV.
          setData(null);
          setError(null);
          return;
        }
        if (err instanceof FetchError && err.status === 401) {
          setAuthenticated(false);
          setData(null);
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bump]);

  return { data, loading, error, authenticated, refresh };
}
