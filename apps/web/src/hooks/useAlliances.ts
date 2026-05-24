'use client';

import { useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';

/* Alliance list client — public GET /api/v1/alliances.
 *
 * Returns the list of all alliances visible to the player. The alliance page
 * uses this as a "current alliance" stand-in when no membership lookup is
 * wired yet; per-member roster + chat will land in a follow-up step. */

export interface AllianceDto {
  id: string;
  name: string;
  tag: string;
  description?: string;
  memberCount?: number;
  power?: number;
  leaderId?: string;
  [key: string]: unknown;
}

interface UseAlliancesResult {
  alliances: AllianceDto[];
  loading: boolean;
  error: string | null;
}

export function useAlliances(): UseAlliancesResult {
  const [alliances, setAlliances] = useState<AllianceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AllianceDto[]>('/alliances')
      .then((data) => {
        if (!cancelled) setAlliances(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        // 401 (guest) is fine — the alliance list itself is public; only the
        // own-alliance lookup would need a token.
        if (err instanceof FetchError && err.status === 401) {
          setAlliances([]);
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

  return { alliances, loading, error };
}
