'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

/* User profile client. Wraps GET /api/v1/users/profile (JWT-only).
 *
 * Uses the shared `api` helper so token + base URL + 401 handling stay
 * consistent with `useSession`. Returns `profile: null` for guests; the
 * consumer falls back to the race-derived placeholder (handle/title from
 * `RACES[race]`).
 *
 * Cycle 8 / DRIFT-1 + DRIFT-2 notes — alliance shape extension and the
 * refresh contract:
 *
 *   The API's /users/profile route now LEFT JOINs alliance_members →
 *   alliances and returns four authoritative alliance fields (allianceId,
 *   allianceTag, allianceName, allianceRole). All four are nullable —
 *   guildless players get `null` for every one of them. Consumers MUST
 *   read these directly off `profile.*` instead of falling back to the
 *   race-derived placeholders (`race.allianceName` / `race.allianceTag`),
 *   which are cosmetic lore strings and have nothing to do with the
 *   player's actual guild state.
 *
 *   The hook also exposes `refresh()` — a stable callback that re-fires
 *   GET /users/profile and updates state. Pages that mutate guild
 *   membership during their lifetime (e.g. /alliance after POST
 *   /alliances/join or /alliances/leave) must call `refresh()` on
 *   success so `hasAlliance = Boolean(profile?.allianceTag)` flips
 *   without forcing the player through a full page reload. The previous
 *   implementation only fetched once on mount (deps: []), so joining an
 *   alliance left the screen stuck in the "İttifak Yok" empty state until
 *   the user reloaded manually.
 */

export interface UserProfileDto {
  id: string;
  username: string;
  email?: string;
  level?: number;
  xp?: number;
  race?: string;
  // Alliance fields (BLOCKER CHAIN-PROFILE-ALLIANCETAG-MISSING fix):
  // the API now LEFT JOINs alliance_members → alliances in getProfile()
  // so a single /users/profile call returns the player's guild context.
  // All four are nullable — guildless players get `null`. The alliance
  // page derives `hasAlliance = Boolean(profile?.allianceTag)` and uses
  // `profile.allianceId` to fetch its war list, so these four fields
  // jointly drive the entire /alliance UI state.
  allianceId?: string | null;
  allianceTag?: string | null;
  allianceName?: string | null;
  allianceRole?: string | null;
  createdAt?: string;
  [key: string]: unknown;
}

interface UseUserProfileResult {
  profile: UserProfileDto | null;
  loading: boolean;
  error: string | null;
  authenticated: boolean;
  /**
   * Re-fetch GET /users/profile on demand. Returns a Promise that resolves
   * once state has been updated, so callers can `await refresh()` before
   * navigating or reading derived values. Safe to call repeatedly; the
   * hook handles in-flight cancellation through `refreshKey`.
   *
   * Call sites: /alliance after join/leave mutations, anywhere else that
   * mutates guild context and needs the next render to reflect it.
   */
  refresh: () => void;
}

export function useUserProfile(): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  // refreshKey bump → effect re-runs → fresh /users/profile fetch. Using
  // a state-based trigger (not a ref to the fetch function) keeps the
  // cancellation semantics from the original effect intact: any in-flight
  // request gets `cancelled = true` before the new one starts.
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!hasSession()) {
      setLoading(false);
      setAuthenticated(false);
      return;
    }
    setAuthenticated(true);
    setLoading(true);
    let cancelled = false;
    api
      .get<UserProfileDto>('/users/profile')
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof FetchError && err.status === 401) {
          // Stale token; treat as guest. (useSession's redirect handles it.)
          setAuthenticated(false);
          setProfile(null);
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
  }, [refreshKey]);

  return { profile, loading, error, authenticated, refresh };
}
