'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';

/* Alliance roster client — wraps GET /api/v1/alliance/members (member-scoped;
 * the backend derives the alliance from the JWT). Backs the alliance page's
 * "Üyeler" tab with the REAL roster (cycle-27 audit ALLIANCE-MEMBERS-STUB —
 * the page used to render a hardcoded 7-member demo list). The backend enriches
 * each row with the player's username + race + a "might" proxy (total_xp);
 * presence is intentionally absent (no presence system → no fake online dot). */

export type AllianceMemberRole =
  | 'leader'
  | 'officer'
  | 'veteran'
  | 'member'
  | 'recruit';

export interface AllianceMemberDto {
  id: string;
  userId: string;
  name: string;
  /** English backend enum (human/zerg/automaton/beast/demon) or null. */
  race: string | null;
  role: AllianceMemberRole;
  contribution: number;
  power: number;
}

interface UseAllianceMembersResult {
  members: AllianceMemberDto[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAllianceMembers(enabled: boolean): UseAllianceMembersResult {
  const [members, setMembers] = useState<AllianceMemberDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<AllianceMemberDto[]>('/alliance/members')
      .then((rows) => {
        if (!cancelled) {
          setMembers(Array.isArray(rows) ? rows : []);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof FetchError ? e.message : 'Üyeler yüklenemedi');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);

  return { members, loading, error, refresh };
}
