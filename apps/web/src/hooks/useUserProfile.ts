'use client';

import { useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

/* User profile client. Wraps GET /api/v1/users/profile (JWT-only).
 *
 * Uses the shared `api` helper so token + base URL + 401 handling stay
 * consistent with `useSession`. Returns `profile: null` for guests; the
 * consumer falls back to the race-derived placeholder (handle/title from
 * `RACES[race]`). */

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
}

export function useUserProfile(): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!hasSession()) {
      setLoading(false);
      setAuthenticated(false);
      return;
    }
    setAuthenticated(true);
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
  }, []);

  return { profile, loading, error, authenticated };
}
