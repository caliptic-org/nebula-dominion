'use client';

import { useCallback, useEffect, useState } from 'react';
import { gameServerApi } from '@/lib/game-server-api';
import { FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

/* Player's currently-activated commander from `GET /commanders/me/active`.
 *
 * SOURCE OF TRUTH: game-server (`/api/commanders/me/active`). Previously
 * hit api's now-removed CommandersStubController on /api/v1/commanders/me/active
 * which 404s post-CommandersModule migration. Switched to gameServerApi so
 * the hook tracks player_commanders rows just like useCommanders does.
 *
 * Returns `null` for guests AND for authenticated players who haven't
 * picked one yet (the BE responds with `null` body in that case — we
 * pass it straight through so the consumer renders the "no active
 * commander" variant without throwing).
 *
 * Exposes a `refresh()` so the /commanders screen can re-fetch after a
 * successful POST :id/activate without waiting for the next mount. */

/** Shape matches game-server's CommanderView returned from
 *  GET /api/commanders/me/active. Field set is a superset of the legacy
 *  api stub shape — older consumers reading `commanderId` continue to
 *  work because the new endpoint also exposes `id` (catalog id) which
 *  is the same string. */
export interface ActiveCommanderDto {
  id: string;
  name: string;
  title: string;
  race: string;
  tier: string;
  level: number;
  /** Legacy alias kept so old call sites referencing this field still
   *  compile. Same value as `id`. */
  commanderId?: string;
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
    gameServerApi
      .get<ActiveCommanderDto | null>('/commanders/me/active')
      .then((json) => {
        if (!cancelled) {
          // Game-server returns null when no commander is active; map to
          // null state without treating it as a failure. Backfill the
          // legacy `commanderId` alias so any older call site still works.
          setData(json ? { ...json, commanderId: json.id } : null);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
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
